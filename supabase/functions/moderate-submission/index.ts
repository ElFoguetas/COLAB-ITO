const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

type ModerationStatus = "approved" | "pending_review" | "rejected";

type ModerationResult = {
    status: ModerationStatus;
    reason: string;
    score: number;
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Method not allowed" }),
                { status: 405, headers: corsHeaders }
            );
        }

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

        if (!geminiApiKey) {
            return new Response(
                JSON.stringify({ error: "Missing GEMINI_API_KEY secret" }),
                { status: 500, headers: corsHeaders }
            );
        }

        const body = await req.json();
        const contentType = body?.contentType ?? "unknown";
        const payload = body?.payload ?? {};
        const fileUrl = body?.fileUrl;
        const fileMimeType = body?.fileMimeType || "application/pdf";

        // Normalizamos el payload buscando tanto las llaves en inglés como las que envía el frontend en español
        const normalizedPayload = {
            title: typeof payload?.title === "string" ? payload.title : (typeof payload?.titulo === "string" ? payload.titulo : ""),
            description: typeof payload?.description === "string" ? payload.description : (typeof payload?.descripcion === "string" ? payload.descripcion : ""),
            summary: typeof payload?.resumen === "string" ? payload.resumen : "",
            tags: Array.isArray(payload?.tags) ? payload.tags : (Array.isArray(payload?.tecnologias) ? payload.tecnologias : []),
            vacancies: Array.isArray(payload?.vacantes) ? payload.vacantes : [],
            extraText: typeof payload?.extraText === "string" ? payload.extraText : "",
        };

        const prompt = `
Actúa como un sistema de moderación automatizado para una plataforma escolar. Tu tarea es clasificar el contenido en UNA de tres categorías: "approved", "rejected", o "pending_review".

INSTRUCCIONES CLARAS:
- Si el texto habla de proyectos escolares, tareas, materias, software, diseño, tecnología o temas académicos normales: DEVUELVE "approved". (Este debe ser tu resultado el 99% de las veces).
- Si el texto tiene groserías, insultos, racismo (ej. "negros fuera"), lenguaje de odio, discriminación o pornografía: DEVUELVE "rejected".
- Si el texto es puro spam (anuncios, casinos) o es contenido extremadamente sospechoso: DEVUELVE "pending_review".

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional ni formato markdown:
{"status": "approved", "reason": "Breve explicación", "score": 1.0}

EJEMPLOS DE COMO DEBES RESPONDER:
Texto: "Proyecto de física sobre la gravedad y desarrollo web en React"
Respuesta: {"status": "approved", "reason": "Contenido académico y tecnológico normal", "score": 1.0}

Texto: "Váyanse a la mierda todos los negros fuera de aquí"
Respuesta: {"status": "rejected", "reason": "Contenido racista, ofensivo y de odio", "score": 0.0}

Texto: "Gana dinero fácil con criptomonedas entrando a este link de casino"
Respuesta: {"status": "pending_review", "reason": "Posible spam o fraude", "score": 0.5}

CONTENIDO A EVALUAR AHORA:
${JSON.stringify({ contentType, payload: normalizedPayload })}
`;

        type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
        const parts: GeminiPart[] = [{ text: prompt }];

        if (fileUrl) {
            const isSupportedMimeType = (mime: string) => {
                const supported = [
                    "application/pdf",
                    "text/plain", "text/html", "text/css", "text/javascript", "application/x-javascript", "text/x-typescript", "application/x-typescript", "text/csv", "text/markdown", "text/x-python", "application/x-python-code", "application/json", "text/xml", "application/rtf", "text/rtf",
                    "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
                    "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp"
                ];
                return supported.includes(mime);
            };

            if (isSupportedMimeType(fileMimeType)) {
                try {
                    const fileRes = await fetch(fileUrl);
                    if (fileRes.ok) {
                        const arrayBuffer = await fileRes.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Convert Uint8Array to base64 in chunks to avoid call stack exceeded
                        let binary = '';
                        const chunkSize = 8192;
                        for (let i = 0; i < uint8Array.length; i += chunkSize) {
                            binary += String.fromCharCode.apply(null, Array.from(uint8Array.subarray(i, i + chunkSize)));
                        }
                        const base64Data = btoa(binary);

                        parts.push({
                            inline_data: {
                                mime_type: fileMimeType,
                                data: base64Data
                            }
                        });
                    } else {
                        console.error("Failed to fetch file for moderation:", fileRes.statusText);
                    }
                } catch (err) {
                    console.error("Exception fetching file for moderation:", err);
                }
            } else {
                console.log(`MIME type ${fileMimeType} no soportado para inline_data de Gemini. Se omite el archivo.`);
                parts.push({
                    text: `\n[NOTA DEL SISTEMA]: El usuario adjuntó un archivo de tipo "${fileMimeType}" (como un DOCX u otro formato no soportado directamente). Su contenido binario no se pudo analizar. Modera esta publicación apoyándote únicamente en el título, descripción y texto enviado.`
                });
            }
        }

        const geminiRes = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiApiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: parts,
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                    },
                }),
            }
        );

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error("Gemini API error:", geminiRes.status, errorText);
            return new Response(
                JSON.stringify({
                    error: "Error de comunicación con el servicio de IA.",
                    details: errorText
                }),
                { status: 400, headers: corsHeaders }
            );
        }

        const geminiData = await geminiRes.json();
        const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let parsed: Partial<ModerationResult> = {};

        try {
            // Clean markdown block that Gemini sometimes wraps JSON in
            let cleanText = rawText.trim();
            if (cleanText.startsWith("```json")) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith("```")) {
                cleanText = cleanText.substring(3);
            }
            if (cleanText.endsWith("```")) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }
            cleanText = cleanText.trim();
            
            parsed = JSON.parse(cleanText);
        } catch (e) {
            console.error("Error al parsear la respuesta de Gemini:", rawText);
            return new Response(
                JSON.stringify({
                    error: "Respuesta inválida desde el servicio de moderación.",
                    rawText
                }),
                { status: 500, headers: corsHeaders }
            );
        }

        const validStatuses: ModerationStatus[] = [
            "approved",
            "pending_review",
            "rejected",
        ];

        const result: ModerationResult = {
            status: validStatuses.includes(parsed.status as ModerationStatus)
                ? (parsed.status as ModerationStatus)
                : "pending_review",
            reason:
                typeof parsed.reason === "string" && parsed.reason.trim().length > 0
                    ? parsed.reason.trim()
                    : "Resultado sin detalle",
            score:
                typeof parsed.score === "number" && Number.isFinite(parsed.score)
                    ? parsed.score
                    : 0.5,
        };

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        console.error("Global Catch Error:", error);

        return new Response(
            JSON.stringify({
                error: "Error interno del servidor durante la moderación.",
                details: message
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        );
    }
});