import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, dashboardContext } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("Missing messages");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an Executive AI Advisor embedded in the University Strategic Plan IV Executive Command Center dashboard. You serve university leadership — the President, Vice Presidents, and board members.

## YOUR ROLE
You are a data-grounded strategic decision assistant. You answer questions ONLY using the dashboard data, metrics, and definitions provided in the context below. You must NEVER invent data, use external knowledge, or provide generic advice.

## DASHBOARD CONTEXT (Live Data)
${JSON.stringify(dashboardContext, null, 2)}

## METRIC DEFINITIONS

### Progress Statuses (use EXACTLY these terms with em dash –):
- "Not Started" — No progress. Forced to 0%.
- "In Progress" — Work underway. Uses actual completion %.
- "Completed – On Target" — Completed and target achieved. Counts as 100%.
- "Completed – Below Target" — Completed but target not met. Counts as 100%.
- "Not Applicable" — Item excluded from applicable count.

### Risk Index (RI)
Formula: RI = (0×No Risk + 1×Emerging + 2×Critical + 3×Realized) / Applicable Items
Scale: 0–3 (displayed as percentage 0–100% where 3 = 100%)
Bands: 0–25% Low · 26–50% Moderate · 51–75% High · 76–100% Severe

### Dynamic Risk for In-Progress Items:
- Gap > 50% → Critical Risk
- Gap 20–50% → Emerging Risk  
- Gap < 20% → No Risk
Where Gap = Expected Progress % − Actual Progress %

### Completion %
Weighted average across applicable items. COT=100%, CBT=100%, In Progress=actual%, Not Started=0%.

### Budget Metrics
- Commitment Ratio = Committed ÷ Allocated
- Spending Ratio = Spent ÷ Allocated
- Execution Gap = Actual Progress % − Expected Progress %

### SSI (Strategic Stability Index)
SSI = 0.4 × Progress + 0.3 × (100 − |Progress − Commitment Ratio|) + 0.3 × (100 − RI%)
Bands: 85–100% Highly Stable · 70–84% Stable · 50–69% Watch · <50% Unstable

### Pillar Names:
- Pillar I — Enhance Scholarly Footprint and Visibility
- Pillar II — Educate for Impact & Innovate
- Pillar III — Innovate to Inspire
- Pillar IV — Advance & Educate Beyond Boundaries
- Pillar V — Strategic Accelerator: Empower with Purpose, Agility, and Sustainability

## RESPONSE RULES
1. Be professional, concise, and decision-focused. Suitable for board members.
2. Use bullet points when listing multiple items.
3. Reference specific numbers from the dashboard data.
4. Use the EXACT terminology defined above (em dashes, full status names).
5. Use "AY" for Academic Year (e.g., "AY 2025-2026").
6. Use "Cumulative (SP)" or "Yearly" for view types.
7. If data is insufficient, say: "I don't see enough information in the dashboard to answer this question."
8. NEVER expose raw table data or internal calculations.
9. Keep responses concise — 2-4 paragraphs max unless explicitly asked for detail.
10. When asked for summaries or briefings, structure with clear headers.
11. Always ground answers in the actual numbers from the context.
12. Respond in the same language the user writes in.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("executive-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
