import { supabase } from '../config/supabaseClient';
import { MODERATION_STATUS } from '../constants/moderation';

/**
 * Llama a la Edge Function "moderate-submission" para moderar contenido vía Gemini.
 *
 * @param {string} contentType - Tipo de contenido (ej. 'material', 'project').
 * @param {object} payload - Los datos a moderar (título, descripción, etc.).
 * @returns {Promise<{ status: string, score: number, flags: string[], error: string|null }>}
 */
export const moderateSubmission = async (contentType, payload) => {
    try {
        const { data, error } = await supabase.functions.invoke('moderate-submission', {
            body: { contentType, payload }
        });

        if (error) {
            console.error('[Moderation Service] Error invocando la función:', error);
            throw new Error('Error de comunicación con el servicio de moderación.');
        }

        return {
            status: data?.status || MODERATION_STATUS.PENDING_REVIEW,
            score: data?.score || 0,
            flags: data?.flags || [],
            error: null
        };
    } catch (err) {
        console.error('[Moderation Service] Excepción en invocación:', err);
        throw new Error(err.message || 'Error en el servicio de moderación.');
    }
};
