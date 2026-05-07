/**
 * src/pages/NotificationsPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Vista de página completa para el listado de notificaciones del usuario.
 * Reutiliza exactamente la misma fuente de datos que NotificationsPanel
 * (lib/notificaciones.js), sin duplicar lógica ni mocks.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
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
    const diffMs  = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)   return 'Ahora mismo';
    if (diffMin < 60)  return `Hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)   return 'Ayer';
    if (diffD < 30)    return `Hace ${diffD} días`;
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

const META_TIPO = {
    solicitud_recibida: {
        icono: (
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
        ),
        fondoIcono: 'bg-blue-100',
    },
    solicitud_aceptada: {
        icono: (
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        fondoIcono: 'bg-emerald-100',
    },
    solicitud_rechazada: {
        icono: (
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        fondoIcono: 'bg-gray-100',
    },
};

const getMeta = (tipo) => META_TIPO[tipo] ?? META_TIPO.solicitud_recibida;

// ─── Skeletons ────────────────────────────────────────────────────────────────
const SkeletonRow = () => (
    <div className="flex gap-4 p-5 animate-pulse">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2.5 py-0.5">
            <div className="h-3.5 bg-gray-200 rounded-md w-2/5" />
            <div className="h-3 bg-gray-100 rounded-md w-4/5" />
            <div className="h-2.5 bg-gray-100 rounded-md w-1/5" />
        </div>
    </div>
);

// ─── NotificationsPage ────────────────────────────────────────────────────────
const NotificationsPage = () => {
    const navigate = useNavigate();

    const [userId, setUserId]                 = useState(null);
    const [notificaciones, setNotificaciones] = useState([]);
    const [cargando, setCargando]             = useState(true);
    const [error, setError]                   = useState(null);
    const [marcandoTodas, setMarcandoTodas]   = useState(false);

    // ─── Obtener sesión al montar ─────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.user) {
                navigate('/login', { replace: true });
                return;
            }
            setUserId(session.user.id);
        });
    }, [navigate]);

    // ─── Cargar notificaciones ────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        if (!userId) return;
        setCargando(true);
        setError(null);
        const { notificaciones: data, error: err } = await listarNotificaciones(userId, 30);
        if (err) {
            setError('No se pudieron cargar las notificaciones. Intenta recargar.');
        } else {
            setNotificaciones(data);
        }
        setCargando(false);
    }, [userId]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // ─── Click en una notificación ────────────────────────────────────────────
    const handleClick = async (notif) => {
        if (!notif.leida) {
            // Optimistic update
            setNotificaciones((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
            );
            marcarLeida(notif.id); // fire and forget
        }
        if (notif.project_id) {
            navigate(`/proyectos/${notif.project_id}`);
        }
    };

    // ─── Marcar todas como leídas ─────────────────────────────────────────────
    const handleMarcarTodas = async () => {
        if (!userId) return;
        setMarcandoTodas(true);
        await marcarTodasLeidas(userId);
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setMarcandoTodas(false);
    };

    const hayNoLeidas = notificaciones.some((n) => !n.leida);
    const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">

            {/* Encabezado de página */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Notificaciones
                            </h1>
                            {!cargando && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {noLeidasCount > 0
                                        ? `${noLeidasCount} notificación${noLeidasCount !== 1 ? 'es' : ''} sin leer`
                                        : 'Todo al día'}
                                </p>
                            )}
                        </div>

                        {!cargando && hayNoLeidas && (
                            <button
                                type="button"
                                onClick={handleMarcarTodas}
                                disabled={marcandoTodas}
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

                    {/* Skeleton */}
                    {cargando && (
                        <div className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
                        </div>
                    )}

                    {/* Estado vacío */}
                    {!cargando && notificaciones.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                </svg>
                            </div>
                            <h2 className="text-base font-semibold text-gray-800">Sin notificaciones</h2>
                            <p className="mt-1 text-sm text-gray-500 max-w-xs">
                                No tienes notificaciones por ahora. Cuando alguien interactúe con tus proyectos aparecerán aquí.
                            </p>
                        </div>
                    )}

                    {/* Lista */}
                    {!cargando && notificaciones.length > 0 && (
                        <div className="divide-y divide-gray-100">
                            {notificaciones.map((notif) => {
                                const { icono, fondoIcono } = getMeta(notif.tipo);
                                return (
                                    <button
                                        key={notif.id}
                                        type="button"
                                        onClick={() => handleClick(notif)}
                                        className={`w-full text-left flex gap-4 p-5 transition-colors ${
                                            notif.leida
                                                ? 'bg-white hover:bg-gray-50'
                                                : 'bg-blue-50/40 hover:bg-blue-50/70'
                                        } ${notif.project_id ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        {/* Ícono */}
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-full ${fondoIcono} flex items-center justify-center`}>
                                            {icono}
                                        </div>

                                        {/* Contenido */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm leading-snug ${
                                                    notif.leida
                                                        ? 'font-medium text-gray-700'
                                                        : 'font-semibold text-gray-900'
                                                }`}>
                                                    {notif.titulo}
                                                </p>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {!notif.leida && (
                                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                                                {notif.mensaje}
                                            </p>

                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-gray-400">
                                                    {formatearTiempoRelativo(notif.created_at)}
                                                </span>
                                                {notif.project_id && (
                                                    <span className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
                                                        Ver proyecto
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pie */}
                {!cargando && notificaciones.length > 0 && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Mostrando las últimas {notificaciones.length} notificaciones
                    </p>
                )}
            </main>
        </div>
    );
};

export default NotificationsPage;
