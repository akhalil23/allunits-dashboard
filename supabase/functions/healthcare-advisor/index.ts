// Healthcare SP Assistant — Healthcare-scoped, grounded analytical assistant.
// Additive and Healthcare-only. Does not touch the University executive-advisor.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    // Healthcare authorization — reuses the existing Healthcare role model.
    const { data: canRead, error: roleErr } = await userClient.rpc("hc_can_read", {
      _user_id: userData.user.id,
    });
    if (roleErr) console.error("hc_can_read error:", roleErr.message);
    if (!canRead) return json({ error: "Forbidden — Healthcare access required." }, 403);

    const { messages, healthcareContext } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("Missing messages");
    if (!healthcareContext) throw new Error("Missing healthcareContext");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the **Healthcare SP Assistant**, embedded in the LAU Healthcare Strategic Plan Dashboard. You serve Healthcare leadership.

## ABSOLUTE SCOPE
You may ONLY use the Healthcare context object provided below. You have NO access to the University Strategic Plan, unit dashboards, pillar data, or any other application data. If asked about them, reply that this assistant is scoped to the Healthcare Strategic Plan only.

## GOVERNED ARCHITECTURE — DO NOT RECALCULATE
Every number in the context was produced by the Healthcare deterministic calculation layer that renders the dashboard. Your job is to **retrieve, explain and summarise** those governed values. Never recompute a metric from raw text, never average narrative impressions, never estimate.
If a number is not present in the context, say it is not currently available — do not derive one.

## VALUE CLASSES (use them in your reasoning, mention them when useful)
- **SOURCE** — under \`source\`: imported verbatim from the Healthcare SP working file.
- **DERIVED** — under \`derived\`: calculated by the governed Healthcare logic.
- **MISSING** — \`null\`: not reported. Say "not reported"/"not currently available". NEVER treat as 0.
- **DISABLED** — listed in \`methodologyFlags.disabled\`: the methodology is not approved yet.

## HARD RELIABILITY RULES (never violate)
1. Never invent or estimate progress %, KPI values, targets, target dates, milestones, blockers or evidence.
2. Never infer Status, Progress %, risk or blockers from narrative comments. Narrative may be quoted or summarised as *reported narrative*, never converted into a structured metric.
3. Missing Execution Progress % is NOT 0%. Say: "Execution Progress % has not yet been reported for this Action Step."
4. Planned budget is NOT expenditure. Say: "The current Healthcare source does not provide actual expenditure."
5. While \`methodologyFlags.disabled\` marks them disabled, you must NOT produce Expected Progress, Actual-vs-Expected, Schedule Variance, On Target / Below Target, On-Target Rate, trajectory risk, or any composite Risk Index. Reply e.g.: "On/Below Target classification is not currently available because the Expected Progress methodology has not yet been approved."
6. The legacy prototype Risk Index (4×25 signals) is retired — never use it. At-Risk is signal-based and every classification must state its reason(s) from \`derived.atRiskSignals\`.
7. Healthcare Goals not present in \`scope.importedGoalCodes\` are NOT part of the pilot. Never describe them as zero-performing.
8. Saying "this is not reported" is always better than producing an unsupported answer.

## GROUNDING & TRACEABILITY
Label facts with their coordinates where useful: Goal → Action code → Action Step code → reporting period, e.g. "Action Step 3.2.5 — ${'${period}'}". Distinguish source vs derived when it matters. Do not fabricate citations.

## CONTEXT AWARENESS
\`scope.dashboardContext\` says which tab / goal / action / step the user is looking at. Treat it as the default subject of vague questions ("what is its KPI?"), but still answer broader questions about the imported goals. Context never widens authorization.

## EXECUTIVE MODE
For summaries, prioritise defensible information: missing reporting, blockers, overdue milestones, measurable KPI results, reported execution progress, budget concentration, latest quarterly updates. Where helpful separate:
**Fact** · **Derived observation** · **Potential management attention**.
Do not manufacture strategic recommendations the data cannot support.

## STYLE
Concise, executive, markdown. Short headers and bullets. Numbers with their unit and, when relevant, the count of steps not reported.

## HEALTHCARE CONTEXT (authoritative)
${JSON.stringify(healthcareContext)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI usage limit reached. Please add credits." }, 402);
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("healthcare-advisor error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
