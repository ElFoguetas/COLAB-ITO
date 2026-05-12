/**
 * src/components/ParticipantesProyecto.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección exclusiva para el autor del proyecto.
 * Muestra los participantes aceptados y permite expulsarlos con doble modal:
 *   1. Confirmación de expulsión
 *   2. Recomendaciones de seguridad post-expulsión
 *
 * Props:
 *   projectId      {string} — ID del proyecto
 *   sessionUserId  {string} — auth_id del usuario autenticado (debe ser creador)
 *   creatorAuthId  {string} — auth_id del creador del proyecto
 *   tituloProyecto {string} — nombre del proyecto (para notificación)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { actualizarEstadoSolicitud } from '../lib/solicitudes';
import { crearNotificacion } from '../lib/notificaciones';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonParticipantes = () => (
    <div className="space-y-3 animate-pulse">
        {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                    <div className="h-4 w-32 bg-gray-200 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                    <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                </div>
            </div>
        ))}
    </div>
);

// ─── Modal de confirmación de expulsión ───────────────────────────────────────
const ModalConfirmarExpulsion = ({ nombre, onCancelar, onConfirmar, procesando }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expulsion-dialog-titulo"
    >
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={!procesando ? onCancelar : undefined}
        />

        {/* Tarjeta */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-[fadeInScale_0.18s_ease-out]">

            {/* Ícono */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100 mx-auto">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
            </div>

            <h2 id="expulsion-dialog-titulo" className="text-base font-bold text-gray-900 text-center mb-1">
                ¿Remover del equipo?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-2">
                <span className="font-semibold text-gray-700">{nombre}</span> dejará de formar parte del equipo de este proyecto.
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
                Esta acción revoca su participación. Podrás aceptar nuevas solicitudes en cualquier momento.
            </p>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancelar}
                    disabled={procesando}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={procesando}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {procesando ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Removiendo…
                        </>
                    ) : (
                        'Sí, remover'
                    )}
                </button>
            </div>
        </div>
    </div>
);

// ─── Modal de recomendaciones de seguridad ────────────────────────────────────

// Íconos SVG reutilizables para cada recomendación — mismo estilo outline que
// los modales existentes en ProjectDetail y SolicitudesRecibidas.
const RECOMENDACIONES = [
    {
        icon: (
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
        texto: 'Elimina su acceso del repositorio de GitHub u otro sistema de control de versiones.',
    },
    {
        icon: (
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
        ),
        texto: 'Cambia claves, tokens o credenciales que hayan sido compartidas con el equipo.',
    },
    {
        icon: (
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 6c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
        texto: 'Verifica permisos en bases de datos, entornos de despliegue y servicios en la nube.',
    },
    {
        icon: (
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        ),
        texto: 'Revisa accesos a carpetas compartidas, documentos y herramientas de colaboración.',
    },
    {
        icon: (
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
        ),
        texto: 'Si usaban canales de comunicación externos, actualiza los permisos correspondientes.',
    },
];

const ModalRecomendaciones = ({ nombre, onCerrar }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recom-dialog-titulo"
    >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCerrar} />

        {/* Tarjeta */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-[fadeInScale_0.18s_ease-out]">

            {/* Ícono de cabecera — shield, igual de sobrio que los modales de ProjectDetail */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 border border-gray-200 mx-auto">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
            </div>

            <h2 id="recom-dialog-titulo" className="text-base font-bold text-gray-900 text-center mb-1">
                Revisa también estos accesos
            </h2>
            <p className="text-sm text-gray-500 text-center mb-5">
                Remover a <span className="font-semibold text-gray-700">{nombre}</span> de COLAB-ITO no revoca permisos externos. Verifica lo siguiente antes de continuar.
            </p>

            {/* Separador */}
            <div className="border-t border-gray-100 mb-4" />

            <ul className="space-y-3.5 mb-6">
                {RECOMENDACIONES.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                        {item.icon}
                        <span className="text-xs text-gray-600 leading-relaxed">{item.texto}</span>
                    </li>
                ))}
            </ul>

            <button
                type="button"
                onClick={onCerrar}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
            >
                Entendido
            </button>
        </div>
    </div>
);

// ─── Tarjeta de participante ──────────────────────────────────────────────────
const TarjetaParticipante = ({ participante, onVerPerfil, onExpulsar, procesandoId }) => {
    const estaProcesando = procesandoId === participante.id;
    const inicial = (participante.applicant_nombre || '?').charAt(0).toUpperCase();

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
            {/* Avatar + nombre */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{inicial}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                        {participante.applicant_nombre || 'Usuario desconocido'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Miembro activo
                    </p>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Ver perfil */}
                <button
                    type="button"
                    onClick={() => onVerPerfil(participante.applicant_auth_id)}
                    title="Ver perfil completo"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Ver perfil
                </button>

                {/* Expulsar */}
                <button
                    type="button"
                    onClick={() => onExpulsar(participante)}
                    disabled={estaProcesando}
                    title="Remover del equipo"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {estaProcesando ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                    )}
                    Remover
                </button>
            </div>
        </div>
    );
};

// ─── ParticipantesProyecto (componente principal) ─────────────────────────────
const ParticipantesProyecto = ({ projectId, sessionUserId, creatorAuthId, tituloProyecto }) => {
    const navigate = useNavigate();

    const [participantes, setParticipantes] = useState([]);
    const [cargando, setCargando]           = useState(true);
    const [errorCarga, setErrorCarga]       = useState(null);

    // Modal 1: confirmación
    const [pendienteExpulsion, setPendienteExpulsion] = useState(null); // participante
    const [procesandoId, setProcesandoId]             = useState(null);

    // Modal 2: recomendaciones post-expulsión
    const [expulsadoNombre, setExpulsadoNombre] = useState(null);

    // ─── Cargar participantes (solicitudes aceptadas) ─────────────────────────
    const cargarParticipantes = useCallback(async () => {
        setCargando(true);
        setErrorCarga(null);

        const { data, error } = await supabase
            .from('solicitudes_proyecto')
            .select('id, applicant_auth_id, applicant_nombre, updated_at')
            .eq('project_id', projectId)
            .eq('estado', 'aceptada')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[ParticipantesProyecto] Error al cargar participantes:', error);
            setErrorCarga('No se pudieron cargar los participantes. Intenta de nuevo.');
        } else {
            setParticipantes(data ?? []);
        }
        setCargando(false);
    }, [projectId]);

    useEffect(() => {
        cargarParticipantes();
    }, [cargarParticipantes]);

    // ─── Navegar al perfil público ────────────────────────────────────────────
    const handleVerPerfil = (userId) => {
        navigate(`/perfil/${userId}`);
    };

    // ─── Abrir modal de confirmación ──────────────────────────────────────────
    const handleSolicitarExpulsion = (participante) => {
        setPendienteExpulsion(participante);
    };

    // ─── Confirmar expulsión ──────────────────────────────────────────────────
    const handleConfirmarExpulsion = async () => {
        if (!pendienteExpulsion) return;
        const participante = pendienteExpulsion;

        // Verificar que el usuario sigue siendo el creador
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== creatorAuthId) {
            setPendienteExpulsion(null);
            return;
        }

        setPendienteExpulsion(null);
        setProcesandoId(participante.id);

        // Cambiar estado a 'rechazada' — representa "ya no forma parte del equipo"
        const { ok } = await actualizarEstadoSolicitud(
            participante.id,
            'rechazada',
            creatorAuthId
        );

        if (ok) {
            // Actualización local inmediata
            setParticipantes((prev) => prev.filter((p) => p.id !== participante.id));

            // Notificar al participante (fire and forget)
            crearNotificacion({
                recipient_auth_id: participante.applicant_auth_id,
                tipo:              'solicitud_rechazada',
                titulo:            'Has sido removido de un proyecto',
                mensaje:           `El autor ha removido tu participación en el proyecto "${tituloProyecto}".`,
                project_id:        projectId,
                solicitud_id:      participante.id,
            }).catch((err) => console.error('[ParticipantesProyecto] Error al notificar:', err));

            // Mostrar modal de recomendaciones
            setExpulsadoNombre(participante.applicant_nombre || 'el participante');
        }

        setProcesandoId(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Modal 1: confirmación de expulsión */}
            {pendienteExpulsion && (
                <ModalConfirmarExpulsion
                    nombre={pendienteExpulsion.applicant_nombre}
                    onCancelar={() => setPendienteExpulsion(null)}
                    onConfirmar={handleConfirmarExpulsion}
                    procesando={procesandoId === pendienteExpulsion.id}
                />
            )}

            {/* Modal 2: recomendaciones de seguridad */}
            {expulsadoNombre && (
                <ModalRecomendaciones
                    nombre={expulsadoNombre}
                    onCerrar={() => setExpulsadoNombre(null)}
                />
            )}

            <section className="mt-10 pt-8 border-t border-gray-200" aria-label="Equipo del proyecto">

                {/* Encabezado */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                            Equipo del proyecto
                        </h2>
                        {!cargando && participantes.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-900 text-white">
                                {participantes.length}
                            </span>
                        )}
                    </div>

                    {/* Botón refrescar */}
                    {!cargando && (
                        <button
                            type="button"
                            onClick={cargarParticipantes}
                            title="Actualizar lista"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    )}
                </div>

                <p className="text-sm text-gray-500 mb-5">
                    Personas que han sido aceptadas en el proyecto. Puedes ver su perfil o removerlos del equipo.
                </p>

                {/* Cargando */}
                {cargando && <SkeletonParticipantes />}

                {/* Error */}
                {!cargando && errorCarga && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                        <p className="text-sm text-red-700 mb-3">{errorCarga}</p>
                        <button
                            type="button"
                            onClick={cargarParticipantes}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Lista vacía */}
                {!cargando && !errorCarga && participantes.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mx-auto">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            Aún no hay miembros en el equipo
                        </p>
                        <p className="text-xs text-gray-400">
                            Cuando aceptes solicitudes de colaboración, los participantes aparecerán aquí.
                        </p>
                    </div>
                )}

                {/* Lista de participantes */}
                {!cargando && !errorCarga && participantes.length > 0 && (
                    <div className="space-y-3">
                        {participantes.map((p) => (
                            <TarjetaParticipante
                                key={p.id}
                                participante={p}
                                onVerPerfil={handleVerPerfil}
                                onExpulsar={handleSolicitarExpulsion}
                                procesandoId={procesandoId}
                            />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
};

export default ParticipantesProyecto;
