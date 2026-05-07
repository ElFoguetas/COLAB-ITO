/**
 * src/components/NotificationsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dropdown de notificaciones para el Navbar.
 * Muestra las 10 notificaciones más recientes del usuario autenticado.
 *
 * Props:
 *   userId            {string}    — auth_id del usuario actual
 *   onNoLeidasChange  {function}  — callback(count) para actualizar el badge
 *   onClose           {function}  — callback para cerrar el panel
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    listarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
} from '../lib/notificaciones';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatearTiempoRelativo = (isoString) => {
    if (!isoString) return '';
    const ahora = new Date();
    const fecha = new Date(isoString);
    const diffMs = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)  return 'Hace 1 día';
    if (diffD < 30)   return `Hace ${diffD} días`;
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

// Ícono SVG según el tipo de notificación
const IconoTipo = ({ tipo }) => {
    if (tipo === 'solicitud_aceptada') {
        return (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        );
    }
    if (tipo === 'solicitud_rechazada') {
        return (
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        );
    }
    // solicitud_recibida (default)
    return (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
        </div>
    );
};

// ─── Skeleton de carga ─────────────────────────────────────────────────────────
const SkeletonNotif = () => (
    <div className="divide-y divide-gray-100 animate-pulse">
        {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 bg-gray-200 rounded-md w-3/4" />
                    <div className="h-3 bg-gray-100 rounded-md w-full" />
                    <div className="h-2.5 bg-gray-100 rounded-md w-1/4" />
                </div>
            </div>
        ))}
    </div>
);

// ─── NotificationsPanel ───────────────────────────────────────────────────────
const NotificationsPanel = ({ userId, onNoLeidasChange, onClose }) => {
    const navigate = useNavigate();
    const [notificaciones, setNotificaciones] = useState([]);
    const [cargando, setCargando]             = useState(true);
    const [marcandoTodas, setMarcandoTodas]   = useState(false);

    // ─── Cargar notificaciones ────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        setCargando(true);
        const { notificaciones: data } = await listarNotificaciones(userId, 10);
        setNotificaciones(data);
        const noLeidas = data.filter((n) => !n.leida).length;
        onNoLeidasChange(noLeidas);
        setCargando(false);
    }, [userId, onNoLeidasChange]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // ─── Click en una notificación ────────────────────────────────────────────
    const handleClickNotif = async (notif) => {
        // Marcar como leída si no lo está
        if (!notif.leida) {
            setNotificaciones((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
            );
            const nuevasNoLeidas = notificaciones.filter(
                (n) => !n.leida && n.id !== notif.id
            ).length;
            onNoLeidasChange(nuevasNoLeidas);
            marcarLeida(notif.id); // fire and forget
        }

        // Navegar al proyecto si existe
        if (notif.project_id) {
            navigate(`/proyectos/${notif.project_id}`);
            onClose();
        }
    };

    // ─── Marcar todas como leídas ─────────────────────────────────────────────
    const handleMarcarTodas = async () => {
        setMarcandoTodas(true);
        await marcarTodasLeidas(userId);
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        onNoLeidasChange(0);
        setMarcandoTodas(false);
    };

    const hayNoLeidas = notificaciones.some((n) => !n.leida);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden"
            role="dialog"
            aria-label="Notificaciones"
        >
            {/* Encabezado */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
                {!cargando && hayNoLeidas && (
                    <button
                        type="button"
                        onClick={handleMarcarTodas}
                        disabled={marcandoTodas}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                        {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
                    </button>
                )}
            </div>

            {/* Contenido */}
            <div className="max-h-[420px] overflow-y-auto">

                {/* Skeleton */}
                {cargando && <SkeletonNotif />}

                {/* Lista vacía */}
                {!cargando && notificaciones.length === 0 && (
                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Sin notificaciones</p>
                        <p className="text-xs text-gray-400 mt-1">No tienes notificaciones por ahora.</p>
                    </div>
                )}

                {/* Lista de notificaciones */}
                {!cargando && notificaciones.length > 0 && (
                    <div className="divide-y divide-gray-100">
                        {notificaciones.map((notif) => (
                            <button
                                key={notif.id}
                                type="button"
                                onClick={() => handleClickNotif(notif)}
                                className={`w-full text-left flex gap-3 px-4 py-3.5 transition-colors ${
                                    notif.leida
                                        ? 'bg-white hover:bg-gray-50'
                                        : 'bg-blue-50/40 hover:bg-blue-50/70'
                                }`}
                            >
                                {/* Ícono tipo */}
                                <IconoTipo tipo={notif.tipo} />

                                {/* Contenido */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-xs leading-snug truncate ${
                                            notif.leida
                                                ? 'font-medium text-gray-700'
                                                : 'font-semibold text-gray-900'
                                        }`}>
                                            {notif.titulo}
                                        </p>
                                        {/* Punto de no leída */}
                                        {!notif.leida && (
                                            <span className="flex-shrink-0 mt-1 h-2 w-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                                        {notif.mensaje}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1.5">
                                        {formatearTiempoRelativo(notif.created_at)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Pie */}
            {!cargando && notificaciones.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/60">
                    <p className="text-[11px] text-gray-400 text-center">
                        Mostrando las últimas {notificaciones.length} notificaciones
                    </p>
                </div>
            )}
        </div>
    );
};

export default NotificationsPanel;
