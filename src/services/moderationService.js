import { supabase } from '../config/supabaseClient';
import { MODERATION_STATUS } from '../constants/moderation';

/**
 * Llama a la Edge Function "moderate-submission" para moderar contenido vía Gemini.
 *
 * @param {string} contentType - Tipo de contenido (ej. 'material', 'project').
 * @param {object} payload - Los datos a moderar (título, descripción, etc.).
 * @returns {Promise<{ status: string, score: number, flags: string[], error: string|null }>}
 */
export const moderateSubmission = async (contentType, payload, fileUrl = null, fileMimeType = null) => {
    try {
        const { data, error } = await supabase.functions.invoke('moderate-submission', {
            body: { contentType, payload, fileUrl, fileMimeType }
        });

        if (error) {
            console.error('[Moderation Service] Error invocando la función:', error);
            
            let errorMessage = 'Error de comunicación con el servicio de moderación.';
            // Si el backend devolvió un JSON con { error, details }, supabase lo guarda a veces en error.context o puedes parsearlo
            if (error instanceof Error && error.context) {
                try {
                    const ctx = await error.context.json();
                    if (ctx.error) errorMessage = ctx.error;
                } catch (e) {
                    // Ignore
                }
            }
            throw new Error(errorMessage);
        }

        const validStatuses = Object.values(MODERATION_STATUS);
        if (!data || !validStatuses.includes(data.status)) {
            console.error('[Moderation Service] Respuesta inválida de la función:', data);
            throw new Error(data?.error || 'Respuesta inválida del servicio de moderación.');
        }

        return {
            status: data.status,
            score: data.score || 0,
            flags: data.flags || [],
            error: null
        };
    } catch (err) {
        console.error('[Moderation Service] Excepción en invocación:', err);
        throw new Error(err.message || 'Error en el servicio de moderación.');
    }
};
