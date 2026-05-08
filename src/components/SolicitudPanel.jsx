/**
 * src/components/SolicitudPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel de acción para unirse a un proyecto.
 * Se renderiza dentro de la barra lateral del ProjectDetail.
 *
 * Maneja todos los estados posibles:
 *   - sin_sesion       → CTA para iniciar sesión
 *   - sin_perfil       → aviso de completar perfil
 *   - es_creador       → "Este es tu proyecto"
 *   - cerrado          → "No acepta nuevas solicitudes"
 *   - ya_solicitado    → "Solicitud enviada"
 *   - puede_solicitar  → formulario de solicitud desplegable
 *   - cargando         → skeleton/spinner inicial
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { consultarSolicitudExistente, crearSolicitud } from '../lib/solicitudes';
import { crearNotificacion } from '../lib/notificaciones';

// ─── Estados posibles del panel ───────────────────────────────────────────────
const PANEL = {
    CARGANDO:       'cargando',
    SIN_SESION:     'sin_sesion',
    SIN_PERFIL:     'sin_perfil',
    ES_CREADOR:     'es_creador',
    CERRADO:        'cerrado',
    YA_SOLICITADO:  'ya_solicitado',
    PUEDE_SOLICITAR:'puede_solicitar',
};

const ESTADOS_ACEPTAN = ['abierto', 'en progreso'];

// ─── SolicitudPanel ───────────────────────────────────────────────────────────
/**
 * @param {{ proyecto: object, sessionUserId: string|null }} props
 */
const SolicitudPanel = ({ proyecto, sessionUserId }) => {
    const [panelEstado, setPanelEstado]   = useState(PANEL.CARGANDO);
    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [mensaje, setMensaje]           = useState('');
    const [enviando, setEnviando]         = useState(false);
    const [errorEnvio, setErrorEnvio]     = useState('');
    const [exitoso, setExitoso]           = useState(false);

    // ─── Determinar estado del panel ─────────────────────────────────────────
    const determinarEstado = useCallback(async () => {
        // Sin sesión
        if (!sessionUserId) {
            setPanelEstado(PANEL.SIN_SESION);
            return;
        }

        // Es el creador
        if (proyecto.creator_auth_id === sessionUserId) {
            setPanelEstado(PANEL.ES_CREADOR);
            return;
        }

        // Proyecto cerrado
        if (!ESTADOS_ACEPTAN.includes(proyecto.estado)) {
            setPanelEstado(PANEL.CERRADO);
            return;
        }

        // Verificar perfil
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('id')
            .eq('id', sessionUserId)
            .maybeSingle();

        if (!perfil) {
            setPanelEstado(PANEL.SIN_PERFIL);
            return;
        }

        // Verificar solicitud previa
        const { existe } = await consultarSolicitudExistente(proyecto.id, sessionUserId);
        if (existe) {
            setPanelEstado(PANEL.YA_SOLICITADO);
            return;
        }

        setPanelEstado(PANEL.PUEDE_SOLICITAR);
    }, [proyecto, sessionUserId]);

    useEffect(() => {
        determinarEstado();
    }, [determinarEstado]);

    // ─── Enviar solicitud ─────────────────────────────────────────────────────
    const handleEnviar = async () => {
        setErrorEnvio('');
        setEnviando(true);

        const { data: { session } } = await supabase.auth.getSession();

        const { ok, data: solicitudData, applicant_nombre, error } = await crearSolicitud({ proyecto, session, mensaje });

        if (!ok) {
            setErrorEnvio(error);
            setEnviando(false);
            return;
        }

        // Notificar al autor del proyecto (fire and forget — no bloquea el flujo)
        crearNotificacion({
            recipient_auth_id: proyecto.creator_auth_id,
            tipo:              'solicitud_recibida',
            titulo:            'Nueva solicitud para tu proyecto',
            mensaje:           `${applicant_nombre || 'Alguien'} quiere unirse a tu proyecto`,
            project_id:        proyecto.id,
            solicitud_id:      solicitudData?.id ?? null,
        }).catch((err) => console.error('[notificaciones] Error inesperado al notificar solicitud:', err));

        setExitoso(true);
        setEnviando(false);
        setFormularioAbierto(false);
        setPanelEstado(PANEL.YA_SOLICITADO);
    };

    // ─── Render según estado ──────────────────────────────────────────────────

    // Skeleton cargando
    if (panelEstado === PANEL.CARGANDO) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1 animate-pulse">
                <div className="h-9 w-full bg-gray-100 rounded-lg" />
            </div>
        );
    }

    // Sin sesión → CTA de login
    if (panelEstado === PANEL.SIN_SESION) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1">
                <p className="text-xs text-gray-500 mb-3 text-center leading-relaxed">
                    Inicia sesión con tu cuenta institucional para solicitar unirte a este proyecto.
                </p>
                <Link
                    to="/login"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Iniciar sesión para unirme
                </Link>
            </div>
        );
    }

    // Sin perfil → aviso
    if (panelEstado === PANEL.SIN_PERFIL) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Perfil incompleto</p>
                    <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                        Necesitas completar tu perfil antes de poder unirte a proyectos.
                    </p>
                    <Link
                        to="/profile"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
                    >
                        Completar mi perfil →
                    </Link>
                </div>
            </div>
        );
    }

    // Es el creador → mensaje informativo
    if (panelEstado === PANEL.ES_CREADOR) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-200 px-4 py-3">
                    <svg className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Este es tu proyecto</span>
                </div>
            </div>
        );
    }

    // Proyecto cerrado
    if (panelEstado === PANEL.CERRADO) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-500">
                        Este proyecto no acepta nuevas solicitudes
                    </span>
                </div>
            </div>
        );
    }

    // Ya solicitado → etiqueta de confirmación
    if (panelEstado === PANEL.YA_SOLICITADO) {
        return (
            <div className="border-t border-gray-200 pt-5 mt-1">
                <div className={`rounded-lg border px-4 py-3 flex items-center gap-2.5 ${
                    exitoso
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200'
                }`}>
                    <svg
                        className={`h-4 w-4 flex-shrink-0 ${exitoso ? 'text-emerald-500' : 'text-gray-400'}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className={`text-xs font-semibold ${exitoso ? 'text-emerald-800' : 'text-gray-700'}`}>
                            Solicitud enviada
                        </p>
                        {exitoso && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                                El creador revisará tu solicitud pronto.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Puede solicitar: botón + formulario desplegable ──────────────────────
    return (
        <div className="border-t border-gray-200 pt-5 mt-1">
            {!formularioAbierto ? (
                // Botón principal
                <button
                    type="button"
                    onClick={() => { setFormularioAbierto(true); setErrorEnvio(''); }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 active:scale-[0.98] transition-all duration-150"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Solicitar unirme
                </button>
            ) : (
                // Formulario desplegable elegante
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-[fadeInScale_0.15s_ease-out]">
                    {/* Encabezado del panel */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-700">Solicitar unirme al proyecto</span>
                        <button
                            type="button"
                            onClick={() => { setFormularioAbierto(false); setErrorEnvio(''); setMensaje(''); }}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            aria-label="Cerrar formulario"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Cuerpo */}
                    <div className="px-4 py-4 space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Mensaje <span className="font-normal text-gray-400">(opcional)</span>
                            </label>
                            <textarea
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                placeholder="Cuéntale al creador por qué te interesa este proyecto, qué puedes aportar o qué experiencia tienes relevante…"
                                rows={6}
                                maxLength={1000}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none resize-y min-h-[120px] transition-colors leading-relaxed"
                            />
                            <p className={`text-right text-xs mt-1 transition-colors ${
                                mensaje.length >= 900
                                    ? 'text-amber-500 font-medium'
                                    : 'text-gray-400'
                            }`}>
                                {mensaje.length}/1000
                            </p>
                        </div>

                        {/* Error de envío */}
                        {errorEnvio && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {errorEnvio}
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => { setFormularioAbierto(false); setErrorEnvio(''); setMensaje(''); }}
                                disabled={enviando}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleEnviar}
                                disabled={enviando}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {enviando ? (
                                    <>
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Enviando…
                                    </>
                                ) : (
                                    'Enviar solicitud'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolicitudPanel;
