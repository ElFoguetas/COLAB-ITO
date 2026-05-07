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
 * Llamar en modo "fire and forget" (no debe bloquear el flujo principal).
 *
 * @param {{ recipient_auth_id, actor_auth_id?, tipo, titulo, mensaje, project_id?, solicitud_id? }} params
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function crearNotificacion({
    recipient_auth_id,
    actor_auth_id    = null,
    tipo,
    titulo,
    mensaje,
    project_id       = null,
    solicitud_id     = null,
}) {
    const payload = {
        recipient_auth_id,
        actor_auth_id,
        tipo,
        titulo,
        mensaje,
        project_id,
        solicitud_id,
        leida: false,
    };

    console.log('[notificaciones] Intentando insertar notificación:', payload);

    const { data, error } = await supabase
        .from('notificaciones')
        .insert(payload)
        .select('id')
        .single();

    if (error) {
        console.error('[notificaciones] ❌ Error al crear notificación. Código:', error.code, '| Mensaje:', error.message, '| Detalles:', error.details, '| Hint:', error.hint);
        console.error('[notificaciones] Payload que causó el error:', payload);
        return { ok: false, error };
    }

    console.log('[notificaciones] ✅ Notificación creada correctamente. ID:', data?.id);
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
