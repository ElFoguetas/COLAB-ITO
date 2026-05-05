/**
 * src/lib/solicitudes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers reutilizables para el sistema de solicitudes de proyecto.
 * Tabla Supabase: solicitudes_proyecto
 *
 * Preparado para escalar a: listado de solicitudes recibidas, aceptar/rechazar,
 * y futura integración con chat.
 */
import { supabase } from '../config/supabaseClient';

/**
 * Consulta si ya existe una solicitud de un usuario para un proyecto dado.
 * @param {string} projectId
 * @param {string} applicantAuthId
 * @returns {Promise<{ existe: boolean, solicitud: object|null, error: object|null }>}
 */
export async function consultarSolicitudExistente(projectId, applicantAuthId) {
    const { data, error } = await supabase
        .from('solicitudes_proyecto')
        .select('id, estado, created_at')
        .eq('project_id', projectId)
        .eq('applicant_auth_id', applicantAuthId)
        .maybeSingle();

    if (error) {
        console.error('[solicitudes] Error al consultar solicitud:', error);
        return { existe: false, solicitud: null, error };
    }

    return { existe: !!data, solicitud: data ?? null, error: null };
}

/**
 * Crea una nueva solicitud de unirse a un proyecto.
 *
 * Validaciones previas antes del insert:
 *  - Sesión activa
 *  - Perfil completo en `perfiles`
 *  - El solicitante no es el creador del proyecto
 *  - El proyecto está en estado abierto o en progreso
 *  - No existe solicitud previa
 *
 * @param {{ proyecto: object, session: object, mensaje: string }} params
 * @returns {Promise<{ ok: boolean, data: object|null, error: string|null }>}
 */
export async function crearSolicitud({ proyecto, session, mensaje }) {
    const userId = session?.user?.id;

    if (!userId) {
        return { ok: false, data: null, error: 'Debes iniciar sesión para enviar una solicitud.' };
    }

    // 1. No permitir que el creador se solicite a sí mismo
    if (proyecto.creator_auth_id === userId) {
        return { ok: false, data: null, error: 'No puedes solicitar unirte a tu propio proyecto.' };
    }

    // 2. Verificar que el proyecto acepte solicitudes
    const estadosValidos = ['abierto', 'en progreso'];
    if (!estadosValidos.includes(proyecto.estado)) {
        return { ok: false, data: null, error: 'Este proyecto no acepta nuevas solicitudes.' };
    }

    // 3. Obtener perfil del solicitante
    const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .eq('id', userId)
        .maybeSingle();

    if (perfilError || !perfil) {
        return { ok: false, data: null, error: 'Debes completar tu perfil antes de enviar una solicitud.' };
    }

    // 4. Verificar duplicado (segunda línea de defensa)
    const { existe } = await consultarSolicitudExistente(proyecto.id, userId);
    if (existe) {
        return { ok: false, data: null, error: 'Ya enviaste una solicitud para este proyecto.' };
    }

    // 5. Insertar la solicitud
    const { data, error: insertError } = await supabase
        .from('solicitudes_proyecto')
        .insert({
            project_id:            proyecto.id,
            project_owner_auth_id: proyecto.creator_auth_id,
            applicant_auth_id:     userId,
            applicant_nombre:      perfil.nombre_completo ?? '',
            mensaje:               (mensaje ?? '').trim(),
            estado:                'pendiente',
        })
        .select('id, estado, created_at')
        .single();

    if (insertError) {
        console.error('[solicitudes] Error al insertar solicitud:', insertError);

        // Código 23505 = unique_violation (duplicado en DB)
        if (insertError.code === '23505') {
            return { ok: false, data: null, error: 'Ya enviaste una solicitud para este proyecto.' };
        }

        return { ok: false, data: null, error: 'No se pudo enviar la solicitud. Intenta de nuevo.' };
    }

    return { ok: true, data, error: null };
}
