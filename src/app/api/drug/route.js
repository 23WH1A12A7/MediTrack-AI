import { NextResponse } from "next/server";

const commonDrugAliases = [
  { pattern: /\bdolo\s*650\b|\bdolo\b|\bparacetamol\b/i, term: "acetaminophen" },
  { pattern: /\bcrocin\b|\bcalpol\b/i, term: "acetaminophen" },
  { pattern: /\bshelcal\b/i, term: "calcium carbonate" },
  { pattern: /\becosprin\b/i, term: "aspirin" },
];

function buildSearchTerms(input) {
  const compact = input.replace(/\s+/g, " ").trim();
  const terms = [compact];
  const alias = commonDrugAliases.find((item) => item.pattern.test(compact));
  if (alias) terms.unshift(alias.term);

  const withoutStrength = compact.replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml)?\b/gi, "").trim();
  if (withoutStrength && !terms.includes(withoutStrength)) terms.push(withoutStrength);
  return Array.from(new Set(terms.filter(Boolean)));
}

async function fetchLabel(term) {
  const quoted = term.replaceAll('"', "");
  const query = [
    `openfda.brand_name:"${quoted}"`,
    `openfda.generic_name:"${quoted}"`,
    `openfda.substance_name:"${quoted}"`,
  ].join(" OR ");
  const response = await fetch(
    `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=1`,
    { next: { revalidate: 60 * 60 * 24 } },
  );

  if (response.status === 404) return { label: null };
  if (!response.ok) throw new Error("Drug lookup failed");
  const payload = await response.json();
  return { label: payload.results?.[0] ?? null };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const drug = searchParams.get("q")?.trim();

  if (!drug) {
    return NextResponse.json({ label: null });
  }

  try {
    for (const term of buildSearchTerms(drug)) {
      const result = await fetchLabel(term);
      if (result.label) {
        return NextResponse.json({ label: result.label, searchedFor: term });
      }
    }
  } catch {
    return NextResponse.json({ error: "Drug lookup failed" }, { status: 502 });
  }

  return NextResponse.json({
    label: null,
    searchedFor: drug,
    message: "No OpenFDA label found. Try the generic ingredient name, for example acetaminophen for Dolo 650.",
  });
}
