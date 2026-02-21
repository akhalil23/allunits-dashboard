import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { summary } = await req.json();
    if (!summary) throw new Error("Missing summary payload");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a strategic planning analyst for a university's Graduate Studies & Research (GSR) division. You analyze execution data from the Strategic Plan IV and provide concise, actionable insights.

You will receive a JSON summary of the current strategic plan data snapshot including:
- Total and SP applicable action items (items where status is not "Not Applicable")
- Status distribution using EXACTLY these terms: "Not Started", "In Progress", "Completed – On Target", "Completed – Below Target"
- Qualifier distribution using EXACTLY these terms: "Achieved", "On Track", "Emerging Risk", "Critical Risk", "Execution Shortfall"
- Risk index (0-3 scale)
- Time progress through the academic year
- Per-pillar completion rates (Pillars I through V)
- Current filters (academic year, term, view type: Cumulative SP or Yearly)

CRITICAL TERMINOLOGY RULES — You MUST use these exact terms in your response:
- For statuses: "Not Applicable", "Not Started", "In Progress", "Completed – On Target", "Completed – Below Target" (with em dash –, not hyphen -)
- For qualifiers: "Achieved", "On Track", "Emerging Risk", "Critical Risk", "Execution Shortfall"
- For views: "Cumulative (SP)" or "Yearly" — never "cumulative view" or "annual"
- For terms: "Mid-Year" or "End-of-Year" — not "midterm" or "final"
- For items: "SP Applicable items" when referring to items that are not "Not Applicable"
- For pillars: "Pillar I", "Pillar II", etc. — not "pillar 1" or "P1"
- "Academic Year" abbreviated as "AY" (e.g. "AY 2025-2026")

Respond with a JSON object using this exact structure:
{
  "headline": "One-sentence executive summary (max 15 words)",
  "insights": [
    {
      "type": "strength" | "risk" | "opportunity",
      "title": "Short title (max 8 words)",
      "detail": "One or two sentences explaining the insight with specific data points"
    }
  ],
  "recommendation": "One actionable recommendation for leadership (max 2 sentences)"
}

Rules:
- Provide exactly 3-4 insights mixing strengths, risks, and opportunities
- Reference specific numbers from the data
- Be direct and avoid jargon
- Focus on actionable intelligence, not just restating numbers
- ALWAYS use the exact terminology listed above — never paraphrase status names, qualifier names, or filter labels
- If most items are Not Started or Not Applicable, note this as an early-stage observation rather than a failure`;

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
          { role: "user", content: JSON.stringify(summary) },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    // Parse the JSON from the response (handle markdown code blocks)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return raw content as headline
      parsed = {
        headline: content.slice(0, 100),
        insights: [],
        recommendation: content,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
