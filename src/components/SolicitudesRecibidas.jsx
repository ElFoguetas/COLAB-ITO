/**
 * src/components/SolicitudesRecibidas.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección exclusiva para el autor del proyecto.
 * Muestra todas las solicitudes recibidas con opción de aceptar o rechazar.
 *
 * Props:
 *   projectId      {string}  — ID del proyecto actual
 *   sessionUserId  {string}  — auth_id del usuario autenticado
 *   creatorAuthId  {string}  — auth_id del creador del proyecto (debe coincidir)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import {
    listarSolicitudesDeProyecto,
    actualizarEstadoSolicitud,
} from '../lib/solicitudes';
import { crearNotificacion } from '../lib/notificaciones';

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const BADGE_STYLES = {
    pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
    aceptada:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rechazada: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const BADGE_LABELS = {
    pendiente: 'Pendiente',
    aceptada:  'Aceptada',
    rechazada: 'Rechazada',
};

const BADGE_DOTS = {
    pendiente: 'bg-amber-400',
    aceptada:  'bg-emerald-500',
    rechazada: 'bg-gray-400',
};

const formatearFechaRelativa = (isoString) => {
    if (!isoString) return '';
    const ahora = new Date();
    const fecha = new Date(isoString);
    const diffMs = ahora - fecha;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Hace 1 día';
    if (diffDias < 30) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonSolicitudes = () => (
    <div className="space-y-3 animate-pulse">
        {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-200" />
                        <div className="h-4 w-32 bg-gray-200 rounded-md" />
                    </div>
                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-md mb-1.5" />
                <div className="h-3 w-4/5 bg-gray-100 rounded-md" />
            </div>
        ))}
    </div>
);

// ─── Modal de confirmación ────────────────────────────────────────────────────
const ModalConfirmacion = ({ accion, nombre, onCancelar, onConfirmar, procesando }) => {
    const esAceptar = accion === 'aceptada';
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-titulo"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={!procesando ? onCancelar : undefined}
            />

            {/* Tarjeta */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-[fadeInScale_0.18s_ease-out]">

                {/* Ícono */}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full mx-auto ${
                    esAceptar ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                }`}>
                    {esAceptar ? (
                        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <h2 id="confirm-dialog-titulo" className="text-base font-bold text-gray-900 text-center mb-1">
                    {esAceptar ? '¿Aceptar esta solicitud?' : '¿Rechazar esta solicitud?'}
                </h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                    {esAceptar
                        ? <>Aceptarás la solicitud de <span className="font-semibold text-gray-700">{nombre}</span> para unirse al proyecto.</>
                        : <>Rechazarás la solicitud de <span className="font-semibold text-gray-700">{nombre}</span>.</>
                    }
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
                        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            esAceptar
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {procesando ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Procesando…
                            </>
                        ) : (
                            esAceptar ? 'Aceptar' : 'Rechazar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Tarjeta individual de solicitud ─────────────────────────────────────────
const TarjetaSolicitud = ({ solicitud, onAccion, procesandoId }) => {
    const esPendiente = solicitud.estado === 'pendiente';
    const estaProcesando = procesandoId === solicitud.id;

    return (
        <div className={`rounded-xl border p-4 transition-all duration-200 ${
            esPendiente
                ? 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
                : 'border-gray-100 bg-gray-50'
        }`}>
            {/* Encabezado: nombre + badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar inicial */}
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 uppercase">
                            {(solicitud.applicant_nombre || '?').charAt(0)}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                            {solicitud.applicant_nombre || 'Usuario desconocido'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {formatearFechaRelativa(solicitud.created_at)}
                        </p>
                    </div>
                </div>

                {/* Badge de estado */}
                <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${BADGE_STYLES[solicitud.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${BADGE_DOTS[solicitud.estado] ?? 'bg-gray-400'}`} />
                    {BADGE_LABELS[solicitud.estado] ?? solicitud.estado}
                </span>
            </div>

            {/* Mensaje del solicitante */}
            {solicitud.mensaje ? (
                <p className="text-sm text-gray-600 leading-relaxed mb-3 pl-10">
                    "{solicitud.mensaje}"
                </p>
            ) : (
                <p className="text-xs text-gray-400 italic mb-3 pl-10">
                    Sin mensaje adjunto.
                </p>
            )}

            {/* Error de acción inline */}
            {solicitud._error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 pl-10">
                    {solicitud._error}
                </div>
            )}

            {/* Botones de acción (solo si pendiente) */}
            {esPendiente && (
                <div className="flex gap-2 pl-10">
                    <button
                        type="button"
                        onClick={() => onAccion(solicitud, 'rechazada')}
                        disabled={estaProcesando}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rechazar
                    </button>
                    <button
                        type="button"
                        onClick={() => onAccion(solicitud, 'aceptada')}
                        disabled={estaProcesando}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {estaProcesando ? (
                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        Aceptar
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── SolicitudesRecibidas (componente principal) ──────────────────────────────
/**
 * @param {{ projectId: string, sessionUserId: string, creatorAuthId: string, tituloProyecto: string }} props
 */
const SolicitudesRecibidas = ({ projectId, sessionUserId, creatorAuthId, tituloProyecto }) => {
    const [solicitudes, setSolicitudes]   = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [errorCarga, setErrorCarga]     = useState(null);

    // Modal de confirmación
    const [confirmacion, setConfirmacion] = useState(null); // { solicitud, accion }
    const [procesandoId, setProcesandoId] = useState(null);

    // ─── Cargar solicitudes ───────────────────────────────────────────────────
    const cargarSolicitudes = useCallback(async () => {
        setCargando(true);
        setErrorCarga(null);

        const { solicitudes: data, error } = await listarSolicitudesDeProyecto(projectId);

        if (error) {
            setErrorCarga('No se pudieron cargar las solicitudes. Intenta de nuevo.');
        } else {
            setSolicitudes(data);
        }
        setCargando(false);
    }, [projectId]);

    useEffect(() => {
        cargarSolicitudes();
    }, [cargarSolicitudes]);

    // ─── Abrir modal de confirmación ──────────────────────────────────────────
    const handleAccion = (solicitud, accion) => {
        setConfirmacion({ solicitud, accion });
    };

    // ─── Confirmar acción ────────────────────────────────────────────────────
    const handleConfirmar = async () => {
        if (!confirmacion) return;
        const { solicitud, accion } = confirmacion;

        // ── Validación de permisos en frontend ──
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== creatorAuthId) {
            // Marcar error en la solicitud y cerrar modal
            setSolicitudes((prev) =>
                prev.map((s) =>
                    s.id === solicitud.id
                        ? { ...s, _error: 'No tienes permiso para realizar esta acción.' }
                        : s
                )
            );
            setConfirmacion(null);
            return;
        }

        setConfirmacion(null);
        setProcesandoId(solicitud.id);

        // Limpiar error previo
        setSolicitudes((prev) =>
            prev.map((s) => (s.id === solicitud.id ? { ...s, _error: undefined } : s))
        );

        const { ok, error } = await actualizarEstadoSolicitud(
            solicitud.id,
            accion,
            creatorAuthId
        );

        if (!ok) {
            // Mostrar error inline en la tarjeta
            setSolicitudes((prev) =>
                prev.map((s) =>
                    s.id === solicitud.id ? { ...s, _error: error } : s
                )
            );
        } else {
            // Actualizar estado local inmediatamente
            setSolicitudes((prev) =>
                prev.map((s) =>
                    s.id === solicitud.id
                        ? { ...s, estado: accion, updated_at: new Date().toISOString(), _error: undefined }
                        : s
                )
            );

            // Notificar al solicitante (fire and forget)
            crearNotificacion({
                recipient_auth_id: solicitud.applicant_auth_id,
                actor_auth_id:     creatorAuthId,
                tipo:              accion === 'aceptada' ? 'solicitud_aceptada' : 'solicitud_rechazada',
                titulo:            accion === 'aceptada'
                    ? 'Tu solicitud fue aceptada'
                    : 'Tu solicitud no fue aceptada',
                mensaje:           accion === 'aceptada'
                    ? `Has sido aceptado en el proyecto "${tituloProyecto}"`
                    : `Tu solicitud para el proyecto "${tituloProyecto}" no fue aceptada`,
                project_id:        projectId,
                solicitud_id:      solicitud.id,
            }).catch((err) => console.error('[notificaciones] Error al notificar decisión:', err));
        }

        setProcesandoId(null);
    };

    // ─── Contadores ──────────────────────────────────────────────────────────
    const totalPendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;
    const totalSolicitudes = solicitudes.length;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Modal de confirmación */}
            {confirmacion && (
                <ModalConfirmacion
                    accion={confirmacion.accion}
                    nombre={confirmacion.solicitud.applicant_nombre}
                    onCancelar={() => setConfirmacion(null)}
                    onConfirmar={handleConfirmar}
                    procesando={procesandoId === confirmacion.solicitud.id}
                />
            )}

            <section className="mt-10 pt-8 border-t border-gray-200" aria-label="Solicitudes recibidas">

                {/* Encabezado de sección */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                            Solicitudes recibidas
                        </h2>
                        {/* Badge con total */}
                        {!cargando && totalSolicitudes > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-900 text-white">
                                {totalSolicitudes}
                            </span>
                        )}
                        {/* Badge de pendientes (si hay) */}
                        {!cargando && totalPendientes > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Botón refrescar */}
                    {!cargando && (
                        <button
                            type="button"
                            onClick={cargarSolicitudes}
                            title="Actualizar lista"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Cargando */}
                {cargando && <SkeletonSolicitudes />}

                {/* Error de carga */}
                {!cargando && errorCarga && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                        <p className="text-sm text-red-700 mb-3">{errorCarga}</p>
                        <button
                            type="button"
                            onClick={cargarSolicitudes}
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
                {!cargando && !errorCarga && solicitudes.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mx-auto">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            Aún no has recibido solicitudes
                        </p>
                        <p className="text-xs text-gray-400">
                            Cuando alguien solicite unirse a este proyecto, aparecerá aquí.
                        </p>
                    </div>
                )}

                {/* Lista de solicitudes */}
                {!cargando && !errorCarga && solicitudes.length > 0 && (
                    <div className="space-y-3">
                        {solicitudes.map((solicitud) => (
                            <TarjetaSolicitud
                                key={solicitud.id}
                                solicitud={solicitud}
                                onAccion={handleAccion}
                                procesandoId={procesandoId}
                            />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
};

export default SolicitudesRecibidas;
