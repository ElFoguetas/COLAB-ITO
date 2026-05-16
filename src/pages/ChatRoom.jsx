// Librerías externas
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

/**
 * ChatRoom — Sala de chat de un proyecto específico.
 * Lee el parámetro `id` de la URL para identificar el proyecto.
 *
 * Reglas de implementación:
 *  - NO se usa join implícito con perfiles (no hay FK declarada entre
 *    project_messages.sender_auth_id y perfiles.id).
 *  - La carga de mensajes se hace en 2 pasos: mensajes + perfiles por separado.
 *  - La suscripción Realtime se crea DESPUÉS de confirmar sesión activa.
 *  - El filtro por project_id se aplica manualmente en el callback (no en el canal)
 *    porque postgres_changes filtra bigint de forma poco confiable.
 *
 * Campos usados de la tabla `perfiles`:
 *   - id              (uuid, PK = auth.users.id) — campo de relación
 *   - nombre_completo (text)                     — nombre visible del usuario
 *
 * Requisitos de base de datos (ejecutar en Supabase SQL Editor si no se ha hecho):
 *   ALTER TABLE public.project_messages REPLICA IDENTITY FULL;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
 */
const ChatRoom = () => {
    // ─── Parámetros de ruta ───────────────────────────────────────────────────
    const { id }    = useParams();
    const navigate  = useNavigate();

    // ─── Estados ─────────────────────────────────────────────────────────────
    const [session,        setSession]        = useState(null);
    const [mensajes,       setMensajes]       = useState([]);
    const [inputValue,     setInputValue]     = useState('');
    const [nombreProyecto, setNombreProyecto] = useState('');
    const [cargando,       setCargando]       = useState(true);
    const [accesoDenegado, setAccesoDenegado] = useState(false);
    const [errorCarga,     setErrorCarga]     = useState(null);  // string | null
    const [enviando,       setEnviando]       = useState(false);
    const [errorEnvio,     setErrorEnvio]     = useState(null);

    // ─── Refs ─────────────────────────────────────────────────────────────────
    const messagesEndRef = useRef(null);

    // ─── Auto-scroll al último mensaje ───────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    // =========================================================================
    // FUNCIÓN: verificarAcceso
    // Retorna true si el usuario es creador o miembro aceptado del proyecto.
    // =========================================================================
    const verificarAcceso = async (pid, userId) => {
        // ¿Es el creador?
        const { data: comoCreador } = await supabase
            .from('proyectos')
            .select('id')
            .eq('id', pid)
            .eq('creator_auth_id', userId)
            .maybeSingle();

        if (comoCreador) return true;

        // ¿Tiene solicitud aceptada?
        const { data: comoMiembro } = await supabase
            .from('solicitudes_proyecto')
            .select('id')
            .eq('project_id', pid)
            .eq('applicant_auth_id', userId)
            .eq('estado', 'aceptada')
            .maybeSingle();

        return !!comoMiembro;
    };

    // =========================================================================
    // FUNCIÓN: cargarMensajes(pid)
    // Carga mensajes en 2 pasos para evitar el join implícito de PostgREST
    // que falla porque no hay FK declarada entre sender_auth_id y perfiles.id.
    // =========================================================================
    const cargarMensajes = async (pid) => {
        console.log('Cargando mensajes de proyecto:', pid);

        // ── Paso A: mensajes puros ──────────────────────────────────────────
        const { data: mensajesData, error: mensajesError } = await supabase
            .from('project_messages')
            .select('id, project_id, sender_auth_id, contenido, created_at')
            .eq('project_id', pid)
            .order('created_at', { ascending: true });

        if (mensajesError) {
            console.error('Error cargando mensajes:', mensajesError);
            setErrorCarga(mensajesError.message || 'No se pudieron cargar los mensajes.');
            return;
        }

        console.log('Mensajes cargados:', mensajesData);

        // ── Paso B: perfiles de los remitentes únicos ───────────────────────
        // La PK de perfiles es `id` (= auth.users.id). NO existe campo `auth_id`.
        const senderIds = [
            ...new Set((mensajesData || []).map((m) => m.sender_auth_id).filter(Boolean)),
        ];

        let perfilesMap = {};

        if (senderIds.length > 0) {
            const { data: perfilesData, error: perfilesError } = await supabase
                .from('perfiles')
                .select('id, nombre_completo')
                .in('id', senderIds);

            if (perfilesError) {
                console.error('Error cargando perfiles:', perfilesError);
                // No es fatal: los mensajes igual se muestran, sin nombre
            }

            console.log('Perfiles cargados:', perfilesData);

            perfilesMap = Object.fromEntries(
                (perfilesData || []).map((p) => [p.id, p])
            );
        }

        // ── Paso C: merge manual ────────────────────────────────────────────
        const mensajesConPerfil = (mensajesData || []).map((m) => ({
            ...m,
            perfil: perfilesMap[m.sender_auth_id] || null,
        }));

        setMensajes(mensajesConPerfil);
        setErrorCarga(null);
    };

    // =========================================================================
    // useEffect PRINCIPAL: sesión → acceso → datos → Realtime
    // Todo en orden estricto para que RLS no rechace las consultas.
    // =========================================================================
    useEffect(() => {
        let channel = null;

        const init = async () => {
            setCargando(true);
            setErrorCarga(null);
            setAccesoDenegado(false);

            // ── 1. Sesión confirmada ANTES de cualquier consulta con RLS ─────
            const { data: { session: s } } = await supabase.auth.getSession();

            console.log('Sesión cargada:', s?.user?.id);

            if (!s) {
                // Sin sesión: redirigir al login
                navigate('/login', { replace: true });
                return;
            }

            setSession(s);
            const userId = s.user.id;
            const pid    = Number(id);

            // ── 2. Verificar que el usuario pertenece al proyecto ────────────
            const tieneAcceso = await verificarAcceso(pid, userId);
            if (!tieneAcceso) {
                setAccesoDenegado(true);
                setCargando(false);
                return;
            }

            // ── 3. Cargar nombre del proyecto para el encabezado ─────────────
            const { data: proyecto } = await supabase
                .from('proyectos')
                .select('titulo')
                .eq('id', pid)
                .maybeSingle();

            setNombreProyecto(proyecto?.titulo ?? 'Chat del proyecto');

            // ── 4. Cargar historial de mensajes ──────────────────────────────
            await cargarMensajes(pid);
            setCargando(false);

            // ── 5. Suscripción Realtime (DESPUÉS de tener sesión activa) ─────
            // Canal nombrado por proyecto + usuario para evitar conflictos.
            // SIN filter en postgres_changes: el filtro bigint no es confiable.
            // Se filtra manualmente en el callback.
            channel = supabase
                .channel(`chat-${pid}-${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'project_messages',
                    },
                    async (payload) => {
                        console.log('Payload realtime recibido:', payload);

                        // Filtro manual por project_id (bigint → Number)
                        if (Number(payload.new.project_id) !== pid) return;

                        // Obtener perfil del remitente por su id (PK de perfiles)
                        const { data: perfil } = await supabase
                            .from('perfiles')
                            .select('id, nombre_completo')
                            .eq('id', payload.new.sender_auth_id)
                            .maybeSingle();

                        const nuevoMensaje = {
                            ...payload.new,
                            perfil: perfil || null,
                        };

                        setMensajes((prev) => {
                            // Evitar duplicados (puede llegar por Realtime Y por el fallback)
                            const existe = prev.some((m) => m.id === nuevoMensaje.id);
                            if (existe) return prev;
                            return [...prev, nuevoMensaje];
                        });
                    }
                )
                .subscribe((status) => {
                    console.log('Realtime status:', status);
                });
        };

        init();

        // Cleanup: cancelar suscripción al desmontar o al cambiar de proyecto
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // =========================================================================
    // ENVÍO DE MENSAJES
    // =========================================================================
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !session || enviando) return;

        const pid = Number(id);

        setEnviando(true);
        setErrorEnvio(null);

        const { error } = await supabase
            .from('project_messages')
            .insert({
                project_id:     pid,
                sender_auth_id: session.user.id,
                contenido:      inputValue.trim(),
            });

        if (error) {
            console.error('Error al enviar mensaje:', error);
            setErrorEnvio('No se pudo enviar el mensaje. Inténtalo de nuevo.');
            setEnviando(false);
            return;
        }

        setInputValue('');
        setEnviando(false);

        // Fallback para el emisor: recargar historial por si Realtime tarda.
        // Los duplicados están controlados por el id único de cada mensaje.
        await cargarMensajes(pid);
    };

    // ─── Helpers de renderizado ──────────────────────────────────────────────
    const esMio = (msg) => msg.sender_auth_id === session?.user?.id;

    const getNombreRemitente = (msg) => msg.perfil?.nombre_completo || 'Usuario';

    const formatearHora = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('es-MX', {
            hour:   '2-digit',
            minute: '2-digit',
        });
    };

    // =========================================================================
    // ESTADO DE GUARDIA: Acceso denegado
    // =========================================================================
    if (accesoDenegado) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Acceso restringido</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                    No tienes acceso al chat de este proyecto. Debes ser miembro del equipo.
                </p>
                <Link to="/proyectos" className="mt-4 text-sm font-medium text-gray-700 hover:text-black underline underline-offset-2">
                    Ver proyectos
                </Link>
            </div>
        );
    }

    // =========================================================================
    // RENDERIZADO PRINCIPAL
    // =========================================================================
    return (
        <div className="flex flex-col h-screen bg-gray-100">

            {/* ── Encabezado ── */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center shadow-sm sticky top-0 z-10">
                <Link to={`/proyectos/${Number(id)}`} className="mr-4 text-gray-500 hover:text-gray-900">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">
                        {nombreProyecto || 'Chat del proyecto'}
                    </h1>
                    <p className="text-xs text-green-500 font-medium">● Conectado</p>
                </div>
            </div>

            {/* ── Área de mensajes ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Spinner de carga inicial */}
                {cargando && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-3">Cargando mensajes…</p>
                    </div>
                )}

                {/* Error de carga con mensaje real */}
                {!cargando && errorCarga && (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-red-600">{errorCarga}</p>
                        <button
                            type="button"
                            onClick={() => cargarMensajes(Number(id))}
                            className="mt-3 text-xs font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Estado vacío */}
                {!cargando && !errorCarga && mensajes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
                            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Aún no hay mensajes</p>
                        <p className="text-xs text-gray-400 mt-1">Sé el primero en escribir en este chat.</p>
                    </div>
                )}

                {/* Lista de mensajes */}
                {!cargando && !errorCarga && mensajes.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${esMio(msg) ? 'items-end' : 'items-start'}`}
                    >
                        <span className="text-xs text-gray-500 mb-1 ml-1 mr-1">
                            {esMio(msg) ? 'Yo' : getNombreRemitente(msg)}
                        </span>
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                                esMio(msg)
                                    ? 'bg-black text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }`}
                        >
                            <p className="text-sm">{msg.contenido}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 mx-1">
                            {formatearHora(msg.created_at)}
                        </span>
                    </div>
                ))}

                {/* Ancla para auto-scroll */}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Error de envío ── */}
            {errorEnvio && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-600 text-center">{errorEnvio}</p>
                </div>
            )}

            {/* ── Formulario de envío ── */}
            <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        disabled={!session || enviando}
                        className="flex-1 rounded-full border-gray-300 bg-gray-50 focus:border-black focus:ring-black px-4 py-2 text-sm shadow-sm disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!session || enviando || !inputValue.trim()}
                        className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors shadow-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {enviando ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="h-5 w-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatRoom;
