/**
 * src/lib/notificaciones.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers para el sistema de notificaciones de COLAB-ITO.
 * Tabla Supabase: notificaciones
 *
 * Tipos de notificación:
 *   solicitud_recibida  — el autor recibe cuando alguien solicita unirse
 *   solicitud_aceptada  — el solicitante recibe cuando es aceptado
 *   solicitud_rechazada — el solicitante recibe cuando es rechazado
 */
import { supabase } from '../config/supabaseClient';

/**
 * Inserta una nueva notificación.
 *
 * actor_auth_id se obtiene SIEMPRE desde supabase.auth.getUser() para
 * garantizar que coincida exactamente con auth.uid() en la policy de INSERT.
 *
 * IMPORTANTE: no se usa .select() después del insert porque la policy de
 * SELECT requiere recipient_auth_id = auth.uid(), y el actor NO es el
 * destinatario — eso causaría un falso error 42501 aunque el INSERT fuera ok.
 *
 * @param {{ recipient_auth_id, tipo, titulo, mensaje, project_id?, solicitud_id? }} params
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function crearNotificacion({
    recipient_auth_id,
    tipo,
    titulo,
    mensaje,
    project_id   = null,
    solicitud_id = null,
}) {
    // 1. Obtener el usuario autenticado real desde Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('[notificaciones] ❌ Sin sesión activa. No se puede insertar notificación.', authError);
        return { ok: false, error: authError ?? 'Sin sesión activa' };
    }

    const payload = {
        recipient_auth_id,
        actor_auth_id: user.id,   // ← siempre del usuario autenticado real
        tipo,
        titulo,
        mensaje,
        project_id,
        solicitud_id,
        leida: false,
    };

    // Logs de diagnóstico
    console.log('[notificaciones] Supabase auth user.id:', user.id);
    console.log('[notificaciones] actor_auth_id enviado:', payload.actor_auth_id);
    console.log('[notificaciones] recipient_auth_id enviado:', payload.recipient_auth_id);
    console.log('[notificaciones] actor === recipient?', payload.actor_auth_id === payload.recipient_auth_id);
    console.log('[notificaciones] payload completo:', payload);

    // 2. Insert sin .select() ni .single() — evita que la policy SELECT bloquee
    const { error } = await supabase
        .from('notificaciones')
        .insert([payload]);

    if (error) {
        console.error('[notificaciones] ❌ Error al insertar. Código:', error.code);
        console.error('[notificaciones] Mensaje:', error.message);
        console.error('[notificaciones] Hint:', error.hint);
        console.error('[notificaciones] Detalles:', error.details);
        console.error('[notificaciones] Payload que causó el error:', payload);
        return { ok: false, error };
    }

    console.log('[notificaciones] ✅ Notificación insertada correctamente.');
    return { ok: true, error: null };
}

/**
 * Lista las notificaciones más recientes del usuario autenticado.
 *
 * @param {string} recipientAuthId
 * @param {number} [limit=10]
 * @returns {Promise<{ notificaciones: object[], error: object|null }>}
 */
export async function listarNotificaciones(recipientAuthId, limit = 10) {
    const { data, error } = await supabase
        .from('notificaciones')
        .select('id, tipo, titulo, mensaje, project_id, solicitud_id, leida, created_at')
        .eq('recipient_auth_id', recipientAuthId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[notificaciones] Error al listar:', error);
        return { notificaciones: [], error };
    }
    return { notificaciones: data ?? [], error: null };
}

/**
 * Cuenta las notificaciones no leídas del usuario.
 *
 * @param {string} recipientAuthId
 * @returns {Promise<{ count: number, error: object|null }>}
 */
export async function contarNoLeidas(recipientAuthId) {
    const { count, error } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_auth_id', recipientAuthId)
        .eq('leida', false);

    if (error) {
        console.error('[notificaciones] Error al contar no leídas:', error);
        return { count: 0, error };
    }
    return { count: count ?? 0, error: null };
}

/**
 * Marca una notificación específica como leída.
 *
 * @param {string} notificacionId
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function marcarLeida(notificacionId) {
    const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, updated_at: new Date().toISOString() })
        .eq('id', notificacionId);

    if (error) {
        console.error('[notificaciones] Error al marcar leída:', error);
        return { ok: false, error };
    }
    return { ok: true, error: null };
}

/**
 * Marca todas las notificaciones no leídas del usuario como leídas.
 *
 * @param {string} recipientAuthId
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function marcarTodasLeidas(recipientAuthId) {
    const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true, updated_at: new Date().toISOString() })
        .eq('recipient_auth_id', recipientAuthId)
        .eq('leida', false);

    if (error) {
        console.error('[notificaciones] Error al marcar todas leídas:', error);
        return { ok: false, error };
    }
    return { ok: true, error: null };
}
