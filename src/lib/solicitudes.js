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

    return { ok: true, data, applicant_nombre: perfil.nombre_completo ?? '', error: null };
}

/**
 * Lista todas las solicitudes recibidas para un proyecto dado.
 * Solo debe llamarse desde la vista del creador del proyecto.
 *
 * @param {string} projectId
 * @returns {Promise<{ solicitudes: object[], error: object|null }>}
 */
export async function listarSolicitudesDeProyecto(projectId) {
    const { data, error } = await supabase
        .from('solicitudes_proyecto')
        .select('id, project_id, project_owner_auth_id, applicant_auth_id, applicant_nombre, mensaje, estado, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[solicitudes] Error al listar solicitudes del proyecto:', error);
        return { solicitudes: [], error };
    }

    return { solicitudes: data ?? [], error: null };
}

/**
 * Actualiza el estado de una solicitud (aceptar / rechazar).
 * Incluye validación de que el solicitante sea el dueño del proyecto.
 *
 * @param {string} solicitudId   — ID de la solicitud a actualizar
 * @param {'aceptada'|'rechazada'} nuevoEstado
 * @param {string} creatorAuthId — auth_id del creador (para filtro de seguridad)
 * @returns {Promise<{ ok: boolean, solicitud: object|null, error: string|null }>}
 */
export async function actualizarEstadoSolicitud(solicitudId, nuevoEstado, creatorAuthId) {
    const estadosValidos = ['aceptada', 'rechazada'];
    if (!estadosValidos.includes(nuevoEstado)) {
        return { ok: false, solicitud: null, error: 'Estado no válido.' };
    }

    const { data, error } = await supabase
        .from('solicitudes_proyecto')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', solicitudId)
        .eq('project_owner_auth_id', creatorAuthId) // filtro de seguridad en DB
        .select('id, estado, updated_at, applicant_nombre')
        .single();

    if (error) {
        console.error('[solicitudes] Error al actualizar estado:', error);
        return { ok: false, solicitud: null, error: 'No se pudo actualizar la solicitud. Intenta de nuevo.' };
    }

    return { ok: true, solicitud: data, error: null };
}
