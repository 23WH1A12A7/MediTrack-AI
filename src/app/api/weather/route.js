import { NextResponse } from "next/server";

export async function GET(request) {
  const key = process.env.WEATHERSTACK_API_KEY;
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  if (!key) {
    return NextResponse.json({ configured: false, weather: null });
  }

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const response = await fetch(
    `http://api.weatherstack.com/current?access_key=${encodeURIComponent(key)}&query=${encodeURIComponent(city)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Weather lookup failed" }, { status: 502 });
  }

  const payload = await response.json();
  const current = payload.current ?? {};
  const advice = [];

  if (typeof current.temperature === "number" && current.temperature >= 35) {
    advice.push("High heat today. Hydrate well and avoid intense outdoor activity at peak hours.");
  }

  if (typeof current.uv_index === "number" && current.uv_index >= 8) {
    advice.push("UV index is high. Use sun protection for outdoor wellness activity.");
  }

  return NextResponse.json({
    configured: true,
    weather: {
      city: payload.location?.name ?? city,
      temperature: current.temperature,
      description: current.weather_descriptions?.[0] ?? "",
      uvIndex: current.uv_index,
      advice,
    },
  });
}
