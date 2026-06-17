import { NextResponse } from "next/server";

const systemPrompt =
  "You are a cautious personal health assistant for an educational Track A project. Give general wellness and medication adherence guidance only. Do not diagnose, prescribe, change doses, or replace a clinician. Recommend professional care for red flag symptoms.";

function offlineInsight(question, context = {}) {
  const medications = context.medications ?? [];
  const adherence = context.adherence ?? { total: 0, taken: 0, missed: 0, rate: 0 };
  const fitness = context.recentFitness ?? [];
  const goals = context.goals ?? [];
  const lowerQuestion = String(question).toLowerCase();
  const latestFitness = fitness[0];

  const lines = [
    "Here is a safe app-based insight from your current records:",
    "",
    `Medication schedule: ${medications.length ? `${medications.length} active medicine(s): ${medications.map((item) => item.name).join(", ")}.` : "No active medicines added yet."}`,
    `Dose tracking: ${adherence.total ? `${adherence.taken}/${adherence.total} logged doses taken (${adherence.rate}% adherence).` : "No dose logs yet, so adherence insights are limited."}`,
    `Wellness logs: ${fitness.length ? `${fitness.length} recent entry/entries. Latest: ${latestFitness.steps ?? 0} steps, ${latestFitness.sleepHours ?? 0}h sleep, mood ${latestFitness.mood ?? "not recorded"}.` : "No fitness or wellness logs yet."}`,
    `Goals: ${goals.length ? goals.map((goal) => `${goal.title} (${goal.current}/${goal.target} ${goal.unit})`).join("; ") : "No goals created yet."}`,
    "",
  ];

  if (lowerQuestion.includes("doctor") || lowerQuestion.includes("ask")) {
    lines.push("For a doctor visit, bring your medication list, missed-dose notes, side effects, sleep/activity trends, and any questions about dosage timing. Do not change dose without clinician advice.");
  } else if (lowerQuestion.includes("care team") || lowerQuestion.includes("request")) {
    lines.push("Care team flow: find a registered doctor/caregiver, send a consent request, and records become visible only after access is approved.");
  } else if (lowerQuestion.includes("adherence") || lowerQuestion.includes("medicine") || lowerQuestion.includes("medication")) {
    lines.push(adherence.rate >= 80 ? "Adherence looks strong. Keep logging doses so the trend remains reliable." : "Adherence needs more data or follow-up. Use reminders, log missed-dose reasons, and discuss repeated misses with a clinician.");
  } else if (lowerQuestion.includes("goal") || lowerQuestion.includes("fitness")) {
    lines.push("For goals, choose a realistic template, log progress daily, and review weekly progress instead of relying on memory.");
  } else {
    lines.push("Today, focus on logging the next dose, adding one wellness entry, and keeping one measurable goal updated. This keeps the dashboard meaningful.");
  }

  lines.push("", "Safety note: this is educational tracking guidance, not diagnosis or treatment.");
  return lines.join("\n");
}

export async function POST(request) {
  const { question, context } = await request.json();

  if (!question?.trim()) {
    return NextResponse.json({ answer: "Ask a health tracking question to get started." });
  }

  if (process.env.GROQ_API_KEY) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${JSON.stringify(context ?? "None")}\n\nQuestion:\n${question}` },
        ],
        temperature: 0.2,
      }),
    });

    if (response.ok) {
      const payload = await response.json();
      return NextResponse.json({ answer: payload.choices?.[0]?.message?.content ?? "" });
    }
  }

  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nContext:\n${JSON.stringify(context ?? "None")}\n\nQuestion:\n${question}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );

    if (response.ok) {
      const payload = await response.json();
      return NextResponse.json({ answer: payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "" });
    }
  }

  return NextResponse.json({
    answer: offlineInsight(question, context),
  });
}
