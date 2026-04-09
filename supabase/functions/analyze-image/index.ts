import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type DetailImageInput = {
  label?: string;
  imageBase64?: string;
};

type Detection = {
  id: number;
  label: string;
  confianca: number;
  bbox: { x: number; y: number; width: number; height: number };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sanitizeBase64 = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").trim()
    : "";

const iou = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - intersection;

  return union > 0 ? intersection / union : 0;
};

const dedupeDetections = (detections: Detection[]) => {
  const sortedByConfidence = [...detections].sort((a, b) => b.confianca - a.confianca);
  const kept: Detection[] = [];

  for (const detection of sortedByConfidence) {
    const duplicated = kept.some((existing) => iou(existing.bbox, detection.bbox) >= 0.58);
    if (!duplicated) kept.push(detection);
  }

  return kept
    .sort((a, b) => (a.bbox.y - b.bbox.y) || (a.bbox.x - b.bbox.x))
    .map((detection, index) => ({
      ...detection,
      id: index + 1,
    }));
};

const sanitizeDetections = (detections: unknown, tipoLabel: string) => {
  if (!Array.isArray(detections)) return [];

  const normalized = detections
    .map((item): Detection | null => {
      if (!item || typeof item !== "object") return null;

      const detection = item as Record<string, unknown>;
      const bbox = (detection.bbox as Record<string, unknown> | undefined) ?? {};
      const x = clamp(Number(bbox.x) || 0, 0, 100);
      const y = clamp(Number(bbox.y) || 0, 0, 100);
      const width = clamp(Number(bbox.width) || 0, 0.1, 100 - x || 0.1);
      const height = clamp(Number(bbox.height) || 0, 0.1, 100 - y || 0.1);

      return {
        id: Number(detection.id) || 0,
        label: typeof detection.label === "string" && detection.label.trim() ? detection.label.trim() : tipoLabel,
        confianca: clamp(Number(detection.confianca) || 0.5, 0, 1),
        bbox: { x, y, width, height },
      };
    })
    .filter((item): item is Detection => !!item);

  return dedupeDetections(normalized);
};

const buildUserContent = ({
  imageBase64,
  detailImages,
  tipoLabel,
  quantidadeEsperada,
  observacoes,
}: {
  imageBase64: string;
  detailImages: Array<{ label: string; imageBase64: string }>;
  tipoLabel: string;
  quantidadeEsperada: number | null;
  observacoes: string | null;
}) => {
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `Imagem principal oficial para contagem. Conte exclusivamente "${tipoLabel}". Quantidade esperada informada: ${quantidadeEsperada ?? "não informada"}. Observações do usuário: ${observacoes ?? "nenhuma"}.`,
    },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
    },
  ];

  detailImages.forEach((detail, index) => {
    content.push({
      type: "text",
      text: `Ampliação ${index + 1} (${detail.label}). Use esta imagem apenas para ampliar detalhes da imagem principal e confirmar itens pequenos. Se um mesmo item aparecer em ampliações diferentes, conte esse item apenas uma vez.`,
    });
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${detail.imageBase64}` },
    });
  });

  return content;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const imageBase64 = sanitizeBase64(body?.imageBase64);

    if (!imageBase64) {
      return jsonResponse({ error: "Imagem não fornecida" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const detailImages = Array.isArray(body?.detailImages)
      ? (body.detailImages as DetailImageInput[])
          .map((detail, index) => ({
            label: typeof detail?.label === "string" && detail.label.trim() ? detail.label.trim() : `detalhe ${index + 1}`,
            imageBase64: sanitizeBase64(detail?.imageBase64),
          }))
          .filter((detail) => detail.imageBase64)
          .slice(0, 4)
      : [];

    const tipoLabel = typeof body?.tipoObjeto === "string" && body.tipoObjeto.trim()
      ? body.tipoObjeto.trim()
      : "objetos/volumes";

    const quantidadeEsperada =
      body?.quantidadeEsperada === null || body?.quantidadeEsperada === undefined || body?.quantidadeEsperada === ""
        ? null
        : (Number.isFinite(Number(body.quantidadeEsperada)) ? Number(body.quantidadeEsperada) : null);

    const observacoes = typeof body?.observacoes === "string" && body.observacoes.trim()
      ? body.observacoes.trim()
      : null;

    const systemPrompt = `Você é um sistema de visão computacional industrial focado em CONTAGEM EXATA de itens físicos.

OBJETIVO PRINCIPAL:
- Contar exclusivamente: "${tipoLabel}"
- Ignorar totalmente qualquer outro material na cena.

VOCÊ RECEBERÁ:
- 1 imagem principal: é o enquadramento oficial e define o mapa global dos itens únicos.
- Até 4 ampliações com sobreposição: servem apenas para confirmar detalhes da imagem principal.

REGRAS ABSOLUTAS:
- Conte SOMENTE "${tipoLabel}".
- Ignore pallets, estrados, cintas, fitas, plástico filme, papelão de proteção, embalagens externas, suportes, prateleiras, estruturas, sombras e reflexos.
- Nunca conte o mesmo item duas vezes por ele aparecer em duas ampliações.
- Nunca invente itens ausentes.
- Nunca some divisões internas, rótulos, vincos ou fitas como se fossem itens separados.
- As bounding boxes finais devem usar coordenadas percentuais (0-100) da IMAGEM PRINCIPAL.
- Cada bounding box deve envolver apenas UM item físico único.
- Ordene os itens finais de cima para baixo e da esquerda para a direita.

PROCESSO OBRIGATÓRIO:
1. Use a imagem principal para identificar o mapa global dos itens únicos.
2. Divida mentalmente a imagem principal em grade 2x2.
3. Revise cada quadrante usando a ampliação correspondente.
4. Conte fileira por fileira, da esquerda para a direita.
5. Some os totais das fileiras.
6. Refaça a contagem em ordem inversa para validar.
7. Se houver quantidade esperada e a diferença for grande, faça uma terceira revisão — mas mantenha o valor visual real, nunca force para bater.
8. Revise duplicidades causadas pelas ampliações com sobreposição.
9. Retorne apenas o total final verificado.
10. Em observacao_ia, descreva a lógica usada nas fileiras e se houve alguma área de dúvida.

Use obrigatoriamente a function tool fornecida para responder.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: buildUserContent({
              imageBase64,
              detailImages,
              tipoLabel,
              quantidadeEsperada,
              observacoes,
            }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detection",
              description: "Report detected objects with bounding boxes in the main image",
              parameters: {
                type: "object",
                properties: {
                  total_detectado: { type: "integer" },
                  confianca_media: { type: "number" },
                  deteccoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        label: { type: "string" },
                        confianca: { type: "number" },
                        bbox: {
                          type: "object",
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                            width: { type: "number" },
                            height: { type: "number" },
                          },
                          required: ["x", "y", "width", "height"],
                        },
                      },
                      required: ["id", "label", "confianca", "bbox"],
                    },
                  },
                  observacao_ia: { type: "string" },
                },
                required: ["total_detectado", "confianca_media", "deteccoes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detection" } },
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("AI gateway error:", response.status, responseText);
      const statusMap: Record<number, string> = {
        429: "Limite de requisições atingido, tente novamente.",
        402: "Créditos insuficientes.",
      };
      return jsonResponse(
        { error: statusMap[response.status] || "Erro ao processar imagem" },
        response.status >= 400 && response.status < 500 ? response.status : 500,
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return jsonResponse({ error: "IA não retornou resultado válido" }, 500);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const deteccoes = sanitizeDetections(parsed?.deteccoes, tipoLabel);
    const totalFromModel = Number(parsed?.total_detectado);
    const totalDetectado = deteccoes.length > 0
      ? deteccoes.length
      : (Number.isFinite(totalFromModel) ? Math.max(0, Math.round(totalFromModel)) : 0);

    const confiancaMedia = deteccoes.length > 0
      ? Number((deteccoes.reduce((sum, detection) => sum + detection.confianca, 0) / deteccoes.length).toFixed(2))
      : (Number.isFinite(Number(parsed?.confianca_media)) ? clamp(Number(parsed.confianca_media), 0, 1) : null);

    return jsonResponse({
      total_detectado: totalDetectado,
      confianca_media: confiancaMedia,
      deteccoes,
      observacao_ia: typeof parsed?.observacao_ia === "string" ? parsed.observacao_ia : null,
    });
  } catch (error) {
    console.error("analyze-image error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      500,
    );
  }
});
