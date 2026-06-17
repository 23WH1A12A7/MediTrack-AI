from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any

import requests


MEDLINE_BASE_URL = "https://wsearch.nlm.nih.gov/ws/query"
OPENFDA_DRUG_LABEL_URL = "https://api.fda.gov/drug/label.json"


@dataclass
class HealthSearchResult:
    title: str
    snippet: str
    url: str
    source: str


def search_medlineplus(query: str, limit: int = 5) -> list[HealthSearchResult]:
    if not query.strip():
        return []

    response = requests.get(
        MEDLINE_BASE_URL,
        params={"db": "healthTopics", "term": query, "retmax": limit, "retmode": "json"},
        timeout=12,
    )
    response.raise_for_status()
    try:
        payload = response.json()
        docs = payload.get("list", {}).get("document", [])
    except ValueError:
        return _parse_medline_xml(response.text)

    results: list[HealthSearchResult] = []
    for doc in docs:
        content = doc.get("content", [])
        title = _content_value(content, "title") or doc.get("title", "MedlinePlus result")
        snippet = _content_value(content, "snippet") or "Reliable consumer health information from MedlinePlus."
        url = _content_value(content, "url") or "https://medlineplus.gov/"
        results.append(HealthSearchResult(title=title, snippet=snippet, url=url, source="MedlinePlus"))
    return results


def _parse_medline_xml(xml_text: str) -> list[HealthSearchResult]:
    root = ET.fromstring(xml_text)
    results: list[HealthSearchResult] = []
    for doc in root.findall(".//document"):
        content = {
            item.attrib.get("name", ""): (item.text or "").strip()
            for item in doc.findall("content")
        }
        results.append(
            HealthSearchResult(
                title=content.get("title", "MedlinePlus result"),
                snippet=content.get("snippet", "Reliable consumer health information from MedlinePlus."),
                url=content.get("url", "https://medlineplus.gov/"),
                source="MedlinePlus",
            )
        )
    return results


def lookup_drug_label(drug_name: str) -> dict[str, Any]:
    if not drug_name.strip():
        return {}

    query = f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"'
    response = requests.get(
        OPENFDA_DRUG_LABEL_URL,
        params={"search": query, "limit": 1},
        timeout=12,
    )
    if response.status_code == 404:
        return {}
    response.raise_for_status()
    results = response.json().get("results", [])
    return results[0] if results else {}


def check_weather_safety(city: str) -> dict[str, Any]:
    api_key = os.getenv("WEATHERSTACK_API_KEY", "").strip()
    if not api_key or not city.strip():
        return {}

    response = requests.get(
        "http://api.weatherstack.com/current",
        params={"access_key": api_key, "query": city},
        timeout=12,
    )
    response.raise_for_status()
    payload = response.json()
    current = payload.get("current", {})
    if not current:
        return {}

    uv_index = current.get("uv_index")
    temperature = current.get("temperature")
    advice = []
    if isinstance(temperature, (int, float)) and temperature >= 35:
        advice.append("High temperature today. Hydrate well and avoid intense outdoor exercise at peak heat.")
    if isinstance(uv_index, (int, float)) and uv_index >= 8:
        advice.append("UV index is high. Use sun protection if going outside.")

    return {
        "city": payload.get("location", {}).get("name", city),
        "temperature": temperature,
        "description": current.get("weather_descriptions", [""])[0],
        "uv_index": uv_index,
        "advice": advice,
    }


def _content_value(content: list[dict[str, Any]], name: str) -> str:
    for item in content:
        if item.get("@name") == name:
            return item.get("#text", "")
    return ""
