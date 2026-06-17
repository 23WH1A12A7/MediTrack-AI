import { NextResponse } from "next/server";

function textBetween(source, tag) {
  const match = source.match(new RegExp(`<content name="${tag}">([\\s\\S]*?)<\\/content>`));
  return decodeXml(match?.[1] ?? "");
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;[^&]*?&gt;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const response = await fetch(
    `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(query)}&retmax=5`,
    { next: { revalidate: 60 * 60 } },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Medical lookup failed" }, { status: 502 });
  }

  const xml = await response.text();
  const documents = xml.split("<document").slice(1);
  const results = documents.map((doc) => ({
    title: textBetween(doc, "title") || "MedlinePlus result",
    snippet: textBetween(doc, "snippet") || "Reliable consumer health information from MedlinePlus.",
    url: textBetween(doc, "url") || "https://medlineplus.gov/",
    source: "MedlinePlus",
  }));

  return NextResponse.json({ results });
}
