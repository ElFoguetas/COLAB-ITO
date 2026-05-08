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

        const normalizedPayload = {
            title: typeof payload?.title === "string" ? payload.title : "",
            description: typeof payload?.description === "string" ? payload.description : "",
            objectives: typeof payload?.objectives === "string" ? payload.objectives : "",
            tags: Array.isArray(payload?.tags) ? payload.tags : [],
            extraText: typeof payload?.extraText === "string" ? payload.extraText : "",
        };

        const prompt = `
Eres un moderador de contenido para una plataforma académica universitaria llamada COLAB-ITO.

Analiza el contenido recibido y clasifícalo como:
- approved
- pending_review
- rejected

Debes rechazar o marcar para revisión contenido con:
- odio o discriminación
- acoso
- violencia explícita
- spam
- fraude
- contenido sexual explícito
- instrucciones peligrosas
- contenido claramente inapropiado para una comunidad académica

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "status": "approved" | "pending_review" | "rejected",
  "reason": "explicación breve",
  "score": 0.0
}

Reglas:
- approved = contenido claramente apto
- pending_review = ambiguo o dudoso
- rejected = claramente inapropiado

Contenido a evaluar:
${JSON.stringify({ contentType, payload: normalizedPayload })}
`;

        const geminiRes = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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
                            parts: [{ text: prompt }],
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
            return new Response(
                JSON.stringify({
                    status: "pending_review",
                    reason: `Gemini request failed: ${errorText}`,
                    score: 0.5,
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        const geminiData = await geminiRes.json();
        const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let parsed: Partial<ModerationResult> = {};

        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = {
                status: "pending_review",
                reason: "No se pudo interpretar la respuesta JSON de Gemini",
                score: 0.5,
            };
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

        return new Response(
            JSON.stringify({
                status: "pending_review",
                reason: message,
                score: 0.5,
            }),
            {
                status: 200,
                headers: corsHeaders,
            }
        );
    }
});