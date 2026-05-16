/**
 * src/components/ChatsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dropdown de chats de proyectos para el Navbar.
 * Muestra los proyectos donde el usuario tiene acceso al chat:
 *   - Proyectos donde es creador (creator_auth_id).
 *   - Proyectos donde tiene solicitud aceptada (estado = 'aceptada').
 *
 * Props:
 *   userId              {string}    — auth_id del usuario actual
 *   onChatCountChange   {function}  — callback(count) para actualizar el badge
 *   onClose             {function}  — callback para cerrar el panel
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

// ─── Skeleton de carga ─────────────────────────────────────────────────────────
const SkeletonChat = () => (
    <div className="divide-y divide-gray-100 animate-pulse">
        {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 bg-gray-200 rounded-md w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded-md w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

// ─── ChatsPanel ───────────────────────────────────────────────────────────────
const ChatsPanel = ({ userId, onChatCountChange, onClose }) => {
    const navigate = useNavigate();
    const [proyectos, setProyectos] = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState(null);

    // ─── Cargar proyectos con acceso al chat ──────────────────────────────────
    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);

        try {
            // 1. Proyectos donde el usuario es creador
            const { data: creados, error: errCreados } = await supabase
                .from('proyectos')
                .select('id, titulo')
                .eq('creator_auth_id', userId);

            if (errCreados) throw errCreados;

            // 2. Proyectos donde tiene solicitud aceptada
            const { data: aceptados, error: errAceptados } = await supabase
                .from('solicitudes_proyecto')
                .select('project_id, proyectos(id, titulo)')
                .eq('applicant_auth_id', userId)
                .eq('estado', 'aceptada');

            if (errAceptados) throw errAceptados;

            // Combinar y eliminar duplicados por id
            const mapProyectos = new Map();

            (creados || []).forEach((p) => {
                mapProyectos.set(p.id, { id: p.id, titulo: p.titulo });
            });

            (aceptados || []).forEach((s) => {
                const p = s.proyectos;
                if (p && !mapProyectos.has(p.id)) {
                    mapProyectos.set(p.id, { id: p.id, titulo: p.titulo });
                }
            });

            const resultado = Array.from(mapProyectos.values());
            setProyectos(resultado);
            if (onChatCountChange) onChatCountChange(resultado.length);
        } catch (err) {
            console.error('Error al cargar chats:', err);
            setError('No se pudieron cargar los chats.');
        } finally {
            setCargando(false);
        }
    }, [userId]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // ─── Click en un proyecto ─────────────────────────────────────────────────
    const handleClickProyecto = (proyectoId) => {
        navigate(`/proyectos/${proyectoId}/chat`);
        onClose();
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden"
            role="dialog"
            aria-label="Chats de proyectos"
        >
            {/* Encabezado */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-bold text-gray-900">Chats de proyectos</h3>
                {!cargando && proyectos.length > 0 && (
                    <span className="text-xs font-medium text-gray-400">
                        {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
                    </span>
                )}
            </div>

            {/* Contenido */}
            <div className="max-h-[420px] overflow-y-auto">

                {/* Skeleton */}
                {cargando && <SkeletonChat />}

                {/* Error */}
                {!cargando && error && (
                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{error}</p>
                        <button
                            type="button"
                            onClick={cargar}
                            className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Lista vacía */}
                {!cargando && !error && proyectos.length === 0 && (
                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Aún no perteneces a ningún equipo</p>
                        <p className="text-xs text-gray-400 mt-1">Únete a un proyecto para chatear con tu equipo.</p>
                    </div>
                )}

                {/* Lista de proyectos */}
                {!cargando && !error && proyectos.length > 0 && (
                    <div className="divide-y divide-gray-100">
                        {proyectos.map((proyecto) => (
                            <button
                                key={proyecto.id}
                                type="button"
                                onClick={() => handleClickProyecto(proyecto.id)}
                                className="w-full text-left flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
                            >
                                {/* Ícono de chat */}
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                                    </svg>
                                </div>

                                {/* Nombre del proyecto */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                        {proyecto.titulo}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Ir al chat del proyecto
                                    </p>
                                </div>

                                {/* Flecha */}
                                <svg className="flex-shrink-0 h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Pie */}
            {!cargando && !error && proyectos.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/60">
                    <p className="text-[11px] text-gray-400 text-center">
                        {proyectos.length} {proyectos.length === 1 ? 'chat disponible' : 'chats disponibles'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChatsPanel;
