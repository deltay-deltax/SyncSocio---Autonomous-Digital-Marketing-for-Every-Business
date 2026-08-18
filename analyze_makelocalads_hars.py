#!/usr/bin/env python3
"""Extract a redacted prompt/model/API catalog from MakeLocalAds HAR exports."""

from __future__ import annotations

import argparse
import base64
import collections
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qs, unquote, urlparse


MODEL_VALUE_RE = re.compile(
    r"(?:gpt-image-[\w.:/-]+|gemini-[\w.:/-]+|claude-[\w.:/-]+|"
    r"flux-[\w.:/-]+|ideogram[\w.:/-]*|recraft[\w.:/-]*|"
    r"seedream[\w.:/-]*|nano-banana[\w.:/-]*)",
    re.IGNORECASE,
)
SENSITIVE_KEY_RE = re.compile(
    r"authorization|cookie|token|secret|password|session|email|phone|credential|api.?key",
    re.IGNORECASE,
)
JSON_MIME_RE = re.compile(r"json|javascript", re.IGNORECASE)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()[:16]


def endpoint(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    if parsed.netloc == "api.trigger.dev":
        path = re.sub(r"(/runs/)[^/]+", r"\1{runId}", path)
    elif parsed.netloc == "localads.t3.storage.dev":
        path = re.sub(r"^/product-images/[^/]+/[^/]+$", "/product-images/{productId}/{assetFile}", path)
        path = re.sub(r"^/brand-logos/[^/]+/[^/]+$", "/brand-logos/{brandId}/{assetFile}", path)
    elif parsed.netloc == "makelocalads.com":
        path = re.sub(r"^/api/creative-assets/[^/]+$", "/api/creative-assets/{assetId}", path)
    return f"{parsed.netloc}{path}"


def is_prompt_key(key: str) -> bool:
    lower = key.lower().replace("_", "")
    if lower.endswith("id"):
        return False
    return any(
        marker in lower
        for marker in (
            "prompt",
            "brief",
            "instruction",
            "visualdescription",
            "shotdescription",
            "designrequirement",
        )
    )


def is_model_key(key: str) -> bool:
    lower = key.lower().replace("_", "")
    if "requestid" in lower:
        return False
    return any(marker in lower for marker in ("model", "provider", "generator"))


def decode_content(content: dict[str, Any]) -> str:
    text = content.get("text") or ""
    if content.get("encoding") == "base64":
        try:
            return base64.b64decode(text).decode("utf-8", errors="replace")
        except Exception:
            return ""
    return text


def parse_json(value: str) -> Any | None:
    value = value.strip()
    if not value or value[0] not in "[{\"":
        return None
    try:
        parsed = json.loads(value)
    except Exception:
        return None
    # Some APIs return a JSON string containing another JSON document.
    for _ in range(2):
        if isinstance(parsed, str) and parsed.strip().startswith(("{", "[")):
            try:
                parsed = json.loads(parsed)
            except Exception:
                break
    return parsed


def walk(value: Any, path: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], Any]]:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = (*path, str(key))
            yield child_path, child
            yield from walk(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            child_path = (*path, str(index))
            yield child_path, child
            yield from walk(child, child_path)


def scalar_paths(value: Any) -> list[str]:
    paths: set[str] = set()
    for path, child in walk(value):
        if isinstance(child, (str, int, float, bool)) or child is None:
            cleaned = ["[]" if part.isdigit() else part for part in path]
            if any(SENSITIVE_KEY_RE.search(part) for part in cleaned):
                paths.add(".".join(cleaned[:-1] + [f"{cleaned[-1]}=[REDACTED]"]))
            else:
                paths.add(".".join(cleaned))
    return sorted(paths)


def request_json(request: dict[str, Any]) -> Any | None:
    post = request.get("postData") or {}
    text = post.get("text") or ""
    parsed = parse_json(text)
    if parsed is not None:
        return parsed

    query = parse_qs(urlparse(request.get("url", "")).query)
    for key in ("input", "batch"):
        for item in query.get(key, []):
            parsed = parse_json(unquote(item))
            if parsed is not None:
                return parsed
    return None


def first_string(*values: Any) -> str:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def nested_dict(value: Any, *path: str) -> dict[str, Any]:
    current = value
    for key in path:
        if not isinstance(current, dict):
            return {}
        current = current.get(key)
    return current if isinstance(current, dict) else {}


def creative_records(value: Any) -> Iterable[dict[str, Any]]:
    """Yield canonical creative objects, ignoring their repeated version copies."""
    if isinstance(value, dict):
        metadata = value.get("metadata")
        current_meta = nested_dict(value, "currentVersion", "metadata")
        display_meta = nested_dict(value, "displayVariation", "metadata")
        version_meta = {}
        versions = value.get("versions")
        if isinstance(versions, list) and versions:
            version_meta = nested_dict(versions[0], "metadata")

        quick_direction = metadata.get("quickShootDirection") if isinstance(metadata, dict) else None
        if not isinstance(quick_direction, dict):
            quick_direction = current_meta.get("quickShootDirection")
        if not isinstance(quick_direction, dict):
            quick_direction = {}

        looks_like_creative = (
            isinstance(metadata, dict)
            and isinstance(value.get("id"), str)
            and any(key in value for key in ("assetUrl", "campaignId", "generationJobId", "versions"))
            and (
                any(metadata.get(key) for key in ("prompt", "brief", "visualDescription"))
                or any(current_meta.get(key) for key in ("imagePrompt", "prompt", "visualDescription"))
                or bool(quick_direction)
            )
        )
        if looks_like_creative:
            prompt = first_string(
                value.get("finalImagePrompt"),
                metadata.get("prompt"),
                current_meta.get("imagePrompt"),
                current_meta.get("prompt"),
                display_meta.get("imagePrompt"),
            )
            brief = first_string(
                metadata.get("brief"),
                current_meta.get("brief"),
                display_meta.get("brief"),
                quick_direction.get("promptFragment"),
            )
            visual = first_string(
                metadata.get("visualDescription"),
                current_meta.get("visualDescription"),
                display_meta.get("visualDescription"),
                quick_direction.get("twoLineShotIdea"),
            )
            model = first_string(
                metadata.get("imageModel"),
                current_meta.get("imageModel"),
                display_meta.get("imageModel"),
                version_meta.get("imageModel"),
            )
            provider = first_string(
                metadata.get("imageProvider"),
                current_meta.get("imageProvider"),
                display_meta.get("imageProvider"),
                version_meta.get("imageProvider"),
            )
            generator = first_string(
                metadata.get("imageGeneratorId"),
                current_meta.get("imageGeneratorId"),
                display_meta.get("imageGeneratorId"),
                version_meta.get("imageGeneratorId"),
            )
            yield {
                "creative_id": value.get("id"),
                "campaign_id": value.get("campaignId"),
                "prompt_recipe_id": value.get("promptRecipeId"),
                "strategy_run_id": value.get("strategyRunId"),
                "offering_kind": value.get("offeringKind"),
                "status": value.get("status"),
                "width": value.get("width"),
                "height": value.get("height"),
                "source": metadata.get("source"),
                "prompt": prompt,
                "brief": brief,
                "visual_description": visual,
                "model": model,
                "provider": provider,
                "generator": generator,
                "framework_hint": (
                    f"Quick Shoot: {quick_direction.get('shotTitle')}"
                    if quick_direction.get("shotTitle")
                    else ""
                ),
                "direction_model": first_string(
                    metadata.get("quickShootDirectionModel"),
                    current_meta.get("quickShootDirectionModel"),
                    version_meta.get("quickShootDirectionModel"),
                ),
                "reference_model": first_string(
                    metadata.get("referenceCompositionModel"),
                    current_meta.get("referenceCompositionModel"),
                    version_meta.get("referenceCompositionModel"),
                ),
                "shot_title": first_string(quick_direction.get("shotTitle")),
                "shot_type": first_string(quick_direction.get("shotType")),
                "why_not_packshot": first_string(quick_direction.get("whyThisIsNotACatalogPackshot")),
                "output_suffix": first_string(
                    nested_dict(metadata, "outputSpec").get("promptSuffix"),
                    nested_dict(current_meta, "outputSpec").get("promptSuffix"),
                    nested_dict(version_meta, "outputSpec").get("promptSuffix"),
                ),
            }
            return

        for child in value.values():
            yield from creative_records(child)
    elif isinstance(value, list):
        for child in value:
            yield from creative_records(child)


def framework_name(brief: str) -> str:
    patterns = (
        r"Based on the ([^(,.]+(?:\([^)]*\))?) framework",
        r"Ground this ad in the ([^(,.]+(?:\([^)]*\))?) framework",
        r"Using the ([^(,.]+(?:\([^)]*\))?) framework",
        r"leverages the ([^(,.]+(?:\([^)]*\))?) framework",
        r"utilizes the ([^(,.]+(?:\([^)]*\))?) framework",
    )
    for pattern in patterns:
        match = re.search(pattern, brief, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    match = re.search(r"\b(AIDA|PAS|BAB|FAB|4Ps|4Cs|QUEST|SBSC|CC)\b", brief)
    return match.group(1) if match else "Unlabelled creative concept"


def markdown_fence(text: str) -> str:
    return f"~~~~text\n{text.strip()}\n~~~~"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--json-output", type=Path, default=Path("artifacts/makelocalads_har_analysis.json"))
    parser.add_argument("--report-output", type=Path, default=Path("MAKELOCALADS_HAR_REVERSE_ENGINEERING.md"))
    args = parser.parse_args()

    har_files = sorted(args.root.glob("makelocalads.com*.har"), key=lambda p: p.name.lower())
    if not har_files:
        raise SystemExit("No MakeLocalAds HAR files found")

    file_summaries: list[dict[str, Any]] = []
    endpoint_stats: dict[str, dict[str, Any]] = {}
    prompt_records: dict[str, dict[str, Any]] = {}
    generic_prompts: dict[str, dict[str, Any]] = {}
    model_records: dict[str, dict[str, Any]] = {}
    full_step_timeline: list[dict[str, Any]] = []
    total_entries = 0

    for har_path in har_files:
        with har_path.open("r", encoding="utf-8", errors="replace") as handle:
            har = json.load(handle)
        entries = (har.get("log") or {}).get("entries") or []
        total_entries += len(entries)
        domains: collections.Counter[str] = collections.Counter()
        statuses: collections.Counter[str] = collections.Counter()
        timestamps: list[str] = []

        for entry in entries:
            request = entry.get("request") or {}
            response = entry.get("response") or {}
            url = request.get("url") or ""
            parsed_url = urlparse(url)
            host = parsed_url.netloc
            domains[host] += 1
            statuses[str(response.get("status"))] += 1
            if entry.get("startedDateTime"):
                timestamps.append(entry["startedDateTime"])

            is_runtime_api = (
                (host == "makelocalads.com" and parsed_url.path.startswith("/api/"))
                or host in {"api.trigger.dev", "localads.t3.storage.dev"}
            )
            if is_runtime_api:
                ep = endpoint(url)
                stat = endpoint_stats.setdefault(
                    ep,
                    {
                        "endpoint": ep,
                        "methods": set(),
                        "count": 0,
                        "statuses": collections.Counter(),
                        "files": set(),
                        "request_fields": set(),
                    },
                )
                stat["methods"].add(request.get("method") or "")
                stat["count"] += 1
                stat["statuses"][str(response.get("status"))] += 1
                stat["files"].add(har_path.name)
                req_json = request_json(request)
                if req_json is not None:
                    stat["request_fields"].update(scalar_paths(req_json))

                if har_path.name == "makelocalads.com_full_step.har":
                    full_step_timeline.append(
                        {
                            "time": entry.get("startedDateTime"),
                            "method": request.get("method"),
                            "endpoint": ep,
                            "status": response.get("status"),
                            "duration_ms": round(entry.get("time") or 0),
                            "request_fields": scalar_paths(req_json) if req_json is not None else [],
                        }
                    )

            req_json = request_json(request)
            if req_json is not None:
                for path, child in walk(req_json):
                    key = path[-1] if path else ""
                    if isinstance(child, str) and len(child.strip()) >= 20 and is_prompt_key(key):
                        digest = sha(child.strip())
                        record = generic_prompts.setdefault(
                            digest,
                            {
                                "id": digest,
                                "kind": "request",
                                "field": key,
                                "text": child.strip(),
                                "sources": set(),
                                "endpoints": set(),
                            },
                        )
                        record["sources"].add(har_path.name)
                        record["endpoints"].add(endpoint(url))

            content = response.get("content") or {}
            raw_response = decode_content(content)
            response_json = parse_json(raw_response)
            if response_json is None:
                # Model identifiers are sometimes embedded in downloaded client bundles.
                if parsed_url.path.endswith(".js"):
                    for match in MODEL_VALUE_RE.findall(raw_response):
                        key = match.lower()
                        record = model_records.setdefault(
                            key,
                            {"value": match, "sources": set(), "paths": set(), "endpoints": set()},
                        )
                        record["sources"].add(har_path.name)
                        record["paths"].add("client bundle string")
                        record["endpoints"].add(endpoint(url))
                continue

            creative_digests_in_response: set[str] = set()
            for creative in creative_records(response_json):
                prompt = creative.get("prompt") or ""
                brief = creative.get("brief") or ""
                visual = creative.get("visual_description") or ""
                digest = sha(prompt or brief or visual)
                creative_digests_in_response.add(digest)
                record = prompt_records.setdefault(
                    digest,
                    {
                        "id": digest,
                        "prompt": prompt,
                        "brief": brief,
                        "visual_description": visual,
                        "framework": creative.get("framework_hint") or framework_name(brief),
                        "creative_ids": set(),
                        "campaign_ids": set(),
                        "prompt_recipe_ids": set(),
                        "strategy_run_ids": set(),
                        "files": set(),
                        "endpoints": set(),
                        "models": set(),
                        "providers": set(),
                        "generators": set(),
                        "direction_models": set(),
                        "reference_models": set(),
                        "shot_titles": set(),
                        "shot_types": set(),
                        "why_not_packshot": set(),
                        "output_suffixes": set(),
                        "sources": set(),
                        "offering_kinds": set(),
                        "dimensions": set(),
                    },
                )
                record["files"].add(har_path.name)
                record["endpoints"].add(endpoint(url))
                for field, target in (
                    ("creative_id", "creative_ids"),
                    ("campaign_id", "campaign_ids"),
                    ("prompt_recipe_id", "prompt_recipe_ids"),
                    ("strategy_run_id", "strategy_run_ids"),
                    ("model", "models"),
                    ("provider", "providers"),
                    ("generator", "generators"),
                    ("direction_model", "direction_models"),
                    ("reference_model", "reference_models"),
                    ("shot_title", "shot_titles"),
                    ("shot_type", "shot_types"),
                    ("why_not_packshot", "why_not_packshot"),
                    ("output_suffix", "output_suffixes"),
                    ("source", "sources"),
                    ("offering_kind", "offering_kinds"),
                ):
                    if creative.get(field):
                        record[target].add(str(creative[field]))
                if creative.get("width") and creative.get("height"):
                    record["dimensions"].add(f"{creative['width']}x{creative['height']}")

            known_texts = {
                text
                for record in prompt_records.values()
                for text in (record.get("prompt"), record.get("brief"), record.get("visual_description"))
                if text
            }
            for path, child in walk(response_json):
                key = path[-1] if path else ""
                if isinstance(child, str):
                    stripped = child.strip()
                    if len(stripped) >= 20 and is_prompt_key(key) and stripped not in known_texts:
                        digest = sha(stripped)
                        record = generic_prompts.setdefault(
                            digest,
                            {
                                "id": digest,
                                "kind": "response",
                                "field": key,
                                "text": stripped,
                                "sources": set(),
                                "endpoints": set(),
                            },
                        )
                        record["sources"].add(har_path.name)
                        record["endpoints"].add(endpoint(url))

                    if is_model_key(key) and len(stripped) <= 120:
                        model_key = stripped.lower()
                        record = model_records.setdefault(
                            model_key,
                            {"value": stripped, "sources": set(), "paths": set(), "endpoints": set()},
                        )
                        record["sources"].add(har_path.name)
                        record["paths"].add(".".join(path))
                        record["endpoints"].add(endpoint(url))
                    else:
                        for match in MODEL_VALUE_RE.findall(stripped):
                            model_key = match.lower()
                            record = model_records.setdefault(
                                model_key,
                                {"value": match, "sources": set(), "paths": set(), "endpoints": set()},
                            )
                            record["sources"].add(har_path.name)
                            record["paths"].add(".".join(path))
                            record["endpoints"].add(endpoint(url))

        file_summaries.append(
            {
                "file": har_path.name,
                "size_bytes": har_path.stat().st_size,
                "entries": len(entries),
                "first_timestamp": min(timestamps) if timestamps else None,
                "last_timestamp": max(timestamps) if timestamps else None,
                "domains": dict(domains.most_common()),
                "statuses": dict(statuses),
            }
        )

    # Some captures include both a promptless generation state and its completed
    # creative. Merge these when the human-readable brief and visual are exact
    # matches so lifecycle polling does not inflate the catalog.
    for digest, record in list(prompt_records.items()):
        if record.get("prompt"):
            continue
        candidates = [
            (other_digest, other)
            for other_digest, other in prompt_records.items()
            if other_digest != digest
            and other.get("prompt")
            and record.get("brief")
            and record.get("brief") == other.get("brief")
            and record.get("visual_description") == other.get("visual_description")
        ]
        if len(candidates) != 1:
            continue
        _, target = candidates[0]
        for key, value in record.items():
            if isinstance(value, set) and isinstance(target.get(key), set):
                target[key].update(value)
        del prompt_records[digest]

    def make_serializable(value: Any) -> Any:
        if isinstance(value, set):
            return sorted(value)
        if isinstance(value, collections.Counter):
            return dict(value)
        if isinstance(value, dict):
            return {key: make_serializable(child) for key, child in value.items()}
        if isinstance(value, list):
            return [make_serializable(child) for child in value]
        return value

    endpoint_list = sorted(endpoint_stats.values(), key=lambda item: (-item["count"], item["endpoint"]))
    creative_list = sorted(
        prompt_records.values(),
        key=lambda item: (sorted(item["files"])[0] if item["files"] else "", item["framework"], item["id"]),
    )
    generic_list = sorted(generic_prompts.values(), key=lambda item: (item["kind"], item["field"], item["id"]))
    model_list = sorted(model_records.values(), key=lambda item: item["value"].lower())

    prompt_coverage: list[dict[str, Any]] = []
    for file_summary in file_summaries:
        file_name = file_summary["file"]
        records = [item for item in creative_list if file_name in item["files"]]
        prompt_coverage.append(
            {
                "file": file_name,
                "prompt_packages": len(records),
                "frameworks": sorted({item["framework"] for item in records}),
                "models": sorted({value for item in records for value in item["models"]}),
                "providers": sorted({value for item in records for value in item["providers"]}),
            }
        )

    analysis = make_serializable(
        {
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "files": file_summaries,
            "total_entries": total_entries,
            "endpoints": endpoint_list,
            "models_and_providers": model_list,
            "prompt_coverage": prompt_coverage,
            "creative_prompts": creative_list,
            "other_prompt_fields": generic_list,
            "full_step_timeline": full_step_timeline,
        }
    )

    json_output = args.root / args.json_output
    json_output.parent.mkdir(parents=True, exist_ok=True)
    json_output.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")

    lines: list[str] = []
    lines.extend(
        [
            "# MakeLocalAds HAR prompt and architecture analysis",
            "",
            "> Evidence-based reverse engineering from browser HAR captures. Secrets, cookies, authorization headers, and personal account fields are intentionally excluded.",
            "",
            "## Executive summary",
            "",
            f"The evidence set contains **{len(file_summaries)} HAR files**, **{total_entries:,} network entries**, "
            f"and **{len(creative_list)} unique generated creative prompt packages** after deduplicating polling responses, versions, and variations.",
            "",
            "The browser talks to a first-party tRPC application API. Long-running ingestion and generation work is surfaced through Trigger.dev realtime run streams; generated/source assets are read from an object-storage host. Image-model calls happen server-side, so the HAR exposes returned prompt/model metadata but not the private server-to-provider request envelopes or hidden system prompts.",
            "",
            "## Evidence and limits",
            "",
            "- **Observed** means directly present in a request, response, URL, or returned metadata field.",
            "- **Inferred** means reconstructed from ordering, naming, polling behavior, or identifiers shared across calls.",
            "- Repeated `creatives.feed` polling responses contain the same prompts many times; the catalog hashes exact text to retain one canonical copy.",
            "- Provider API keys, cookies, session values, bearer tokens, emails, and phone numbers are not reproduced.",
            "- HAR captures cannot reveal server-only source code or undisclosed prompt templates. The catalog contains all prompt-bearing values observable in these captures.",
            "",
            "## HAR inventory",
            "",
            "| File | Size | Entries | Capture window | Main domains |",
            "|---|---:|---:|---|---|",
        ]
    )
    for item in file_summaries:
        size_mb = item["size_bytes"] / (1024 * 1024)
        window = f"{item['first_timestamp'] or 'n/a'} → {item['last_timestamp'] or 'n/a'}"
        domains = ", ".join(f"`{host}` ({count})" for host, count in list(item["domains"].items())[:5])
        lines.append(f"| `{item['file']}` | {size_mb:.1f} MB | {item['entries']} | {window} | {domains} |")

    lines.extend(
        [
            "",
            "## Reconstructed architecture",
            "",
            "```mermaid",
            "flowchart LR",
            '  U["Browser / React client"] -->|"HTTPS + tRPC"| A["makelocalads.com application API"]',
            '  A -->|"enqueue / observe runs"| T["Trigger.dev background jobs"]',
            '  A -->|"server-side prompt + image generation"| M["AI model providers"]',
            '  A -->|"store metadata, campaigns, creatives"| D["Application database"]',
            '  A -->|"asset URLs"| S["localads.t3.storage.dev object storage"]',
            '  U -->|"realtime run subscription"| T',
            '  U -->|"image and creative asset reads"| S',
            '  U -->|"analytics / session events"| B["b.makelocalads.com"]',
            '  U -->|"support widget"| F["Featurebase"]',
            "```",
            "",
            "### Component evidence",
            "",
            "| Component | Evidence | Role | Confidence |",
            "|---|---|---|---|",
            "| First-party web/API | `makelocalads.com`, `/api/trpc/*`, `/api/auth/*` | UI assets, session, brands, products, audiences, campaigns, creatives, credits | Observed |",
            "| Workflow runner | `api.trigger.dev/realtime/v1/runs/*` | Realtime status/results for product ingestion and asynchronous generation | Observed |",
            "| Object storage | `localads.t3.storage.dev/*` | Product images and generated creative assets | Observed |",
            "| Analytics/feature flags | `b.makelocalads.com/s/`, `/i/v0/e/`, `/flags/` | Session/event telemetry and flags | Inferred from endpoint shape |",
            "| Support/feedback | `do.featurebase.app/v1/messenger/widget/ping` | Embedded customer-support widget | Observed |",
            "| AI providers | Returned `imageModel`, `imageProvider`, and `imageGeneratorId` fields | Server-side image generation | Observed metadata; provider calls themselves are not in HAR |",
            "",
            "## API surface observed",
            "",
            "| Endpoint | Methods | Calls | Statuses | HAR files | Request field paths (redacted) |",
            "|---|---|---:|---|---|---|",
        ]
    )
    for item in endpoint_list:
        methods = ", ".join(f"`{method}`" for method in sorted(item["methods"]) if method)
        statuses = ", ".join(f"{key}: {value}" for key, value in sorted(item["statuses"].items()))
        files = ", ".join(f"`{name}`" for name in sorted(item["files"]))
        fields = ", ".join(f"`{field}`" for field in sorted(item["request_fields"])[:18])
        if len(item["request_fields"]) > 18:
            fields += f", … (+{len(item['request_fields']) - 18})"
        lines.append(f"| `{item['endpoint']}` | {methods} | {item['count']} | {statuses} | {files} | {fields or '—'} |")

    lines.extend(
        [
            "",
            "## Models, providers, and generator identifiers",
            "",
            "| Observed value | Evidence paths | HAR files | Interpretation |",
            "|---|---|---|---|",
        ]
    )
    for item in model_list:
        value = item["value"]
        paths = ", ".join(f"`{path}`" for path in sorted(item["paths"])[:6])
        files = ", ".join(f"`{name}`" for name in sorted(item["sources"]))
        lower = value.lower()
        if lower == "gpt-image-2-low":
            interpretation = "Client-bundle option string; this capture does not prove it was selected for a generation"
        elif "gpt-image" in lower:
            interpretation = "OpenAI-family image model identifier or quality/routing alias"
        elif "gemini" in lower:
            interpretation = "Reference-composition model returned for Photoshoot/Quick Shoot"
        elif lower == "gpt-5.5":
            interpretation = "Quick Shoot direction/planning model returned in creative metadata"
        elif lower in {"openai", "azure-openai"}:
            interpretation = "Image-provider/routing label"
        else:
            interpretation = "Provider/generator metadata value; exact vendor semantics not proven"
        lines.append(f"| `{value}` | {paths or '—'} | {files} | {interpretation} |")

    lines.extend(
        [
            "",
            "## Prompt coverage by capture",
            "",
            "| HAR file | Unique prompt packages | Frameworks / concepts | Image models | Providers |",
            "|---|---:|---|---|---|",
        ]
    )
    for item in prompt_coverage:
        frameworks = ", ".join(f"`{value}`" for value in item["frameworks"]) or "—"
        models = ", ".join(f"`{value}`" for value in item["models"]) or "—"
        providers = ", ".join(f"`{value}`" for value in item["providers"]) or "—"
        lines.append(
            f"| `{item['file']}` | {item['prompt_packages']} | {frameworks} | {models} | {providers} |"
        )

    lines.extend(
        [
            "",
            "## Full-step workflow reconstruction",
            "",
            "The `full_step` trace shows the broad orchestration below. Poll-only calls are retained in the detailed timeline, but collapsed conceptually here.",
            "",
            "1. Load session, credits, brand/design-guide state, offerings, notifications, and product state.",
            "2. Create/select a brand and collect a URL style snapshot.",
            "3. Save initial product data and start `products.startProductIngestion`.",
            "4. Subscribe to a Trigger.dev run; background work extracts product content and images.",
            "5. Save the enriched product draft, fetch recommended audiences, and approve selected recommendations.",
            "6. Activate the product/offering.",
            "7. Create an ad campaign through `adCampaignsV2.createCampaign`.",
            "8. Poll campaign state and `creatives.feed` while asynchronous strategy/generation jobs run.",
            "9. Receive creative metadata containing `brief`, `prompt`, model/provider identifiers, asset URLs, versions, and variations.",
            "10. Fetch generated assets through first-party creative-asset URLs and object storage.",
            "",
            "### Detailed `full_step` API timeline",
            "",
            "| Time | Method | Endpoint | Status | Duration | Request fields |",
            "|---|---|---|---:|---:|---|",
        ]
    )
    for event in full_step_timeline:
        fields = ", ".join(f"`{field}`" for field in event["request_fields"][:12])
        if len(event["request_fields"]) > 12:
            fields += f", … (+{len(event['request_fields']) - 12})"
        time = (event["time"] or "").replace("2026-08-17T", "")
        lines.append(
            f"| {time} | `{event['method']}` | `{event['endpoint']}` | {event['status']} | "
            f"{event['duration_ms']} ms | {fields or '—'} |"
        )

    lines.extend(
        [
            "",
            "## Prompt construction pattern",
            "",
            "Across returned creatives, the observable pipeline is consistently layered:",
            "",
            "1. **Campaign/strategy context** selects an audience, marketing objective, angle, and copywriting framework.",
            "2. **Creative brief** (`metadata.brief`) describes the intended persuasion mechanism, composition, headline/copy, product placement, branding, and visual hierarchy.",
            "3. **Visual description** (`metadata.visualDescription`) supplies a shorter visual concept in some modes.",
            "4. **Final image prompt** (`metadata.prompt`, `finalImagePrompt`, or `imagePrompt`) starts with the director brief and expands it with production constraints, reference-image instructions, layout, typography, realism, brand fidelity, and exclusions.",
            "5. **Server-side routing metadata** records provider/model/generator identifiers, moderation/fallback state, reference-image normalization, dimensions, versioning, and provider request IDs.",
            "6. **Generation output** is stored as an asset plus a version/variation tree; polling repeats the same metadata until status changes.",
            "",
            "## Complete unique creative prompt catalog",
            "",
            "Each entry below preserves the full observable brief and final prompt. Exact duplicates across polling responses and nested versions are merged.",
            "",
        ]
    )

    for index, item in enumerate(creative_list, start=1):
        files = ", ".join(f"`{name}`" for name in item["files"])
        models = ", ".join(f"`{name}`" for name in item["models"]) or "Not returned"
        providers = ", ".join(f"`{name}`" for name in item["providers"]) or "Not returned"
        generators = ", ".join(f"`{name}`" for name in item["generators"]) or "Not returned"
        direction_models = ", ".join(f"`{name}`" for name in item["direction_models"])
        reference_models = ", ".join(f"`{name}`" for name in item["reference_models"])
        shot_titles = ", ".join(item["shot_titles"])
        shot_types = ", ".join(item["shot_types"])
        lines.extend(
            [
                f"### P-{index:03d}: {item['framework']}",
                "",
                f"- Evidence ID: `{item['id']}`",
                f"- HAR source(s): {files}",
                f"- Model(s): {models}",
                f"- Provider(s): {providers}",
                f"- Generator ID(s): {generators}",
                f"- Dimensions: {', '.join(item['dimensions']) or 'Not returned'}",
                f"- Offering kind(s): {', '.join(item['offering_kinds']) or 'Not returned'}",
                *([f"- Direction model(s): {direction_models}"] if direction_models else []),
                *([f"- Reference-composition model(s): {reference_models}"] if reference_models else []),
                *([f"- Shot title(s): {shot_titles}"] if shot_titles else []),
                *([f"- Shot type(s): {shot_types}"] if shot_types else []),
                "",
                "**Creative brief**",
                "",
                markdown_fence(item["brief"]) if item["brief"] else "Not returned.",
                "",
                "**Visual description**",
                "",
                markdown_fence(item["visual_description"]) if item["visual_description"] else "Not returned separately.",
                "",
                "**Final image prompt**",
                "",
                markdown_fence(item["prompt"]) if item["prompt"] else "Not returned separately.",
                "",
            ]
        )
        if item["why_not_packshot"]:
            lines.extend(
                [
                    "**Why this is not a catalog packshot**",
                    "",
                    *(markdown_fence(value) for value in item["why_not_packshot"]),
                    "",
                ]
            )
        if item["output_suffixes"]:
            lines.extend(
                [
                    "**Output prompt suffix**",
                    "",
                    *(markdown_fence(value) for value in item["output_suffixes"]),
                    "",
                ]
            )

    if generic_list:
        lines.extend(
            [
                "## Additional prompt-adjacent request/response fields",
                "",
                "This is a deliberately broad keyword pass over fields such as `promptSuffix`, `visual_description`, and `*Instructions`. They were not attached to a canonical creative object, so they are preserved separately. `promptSuffix` and provider-style visual descriptions are strong prompt-construction evidence; product usage/storage/dosage instructions may only be upstream product context and are not proven model prompts.",
                "",
            ]
        )
        for index, item in enumerate(generic_list, start=1):
            sources = ", ".join(f"`{name}`" for name in item["sources"])
            eps = ", ".join(f"`{name}`" for name in item["endpoints"])
            lines.extend(
                [
                    f"### X-{index:03d}: {item['kind']} field `{item['field']}`",
                    "",
                    f"- Source(s): {sources}",
                    f"- Endpoint(s): {eps}",
                    "",
                    markdown_fence(item["text"]),
                    "",
                ]
            )

    lines.extend(
        [
            "## Key architectural conclusions",
            "",
            "- The frontend does not call OpenAI/Google image APIs directly; model invocation is behind the MakeLocalAds application API/background jobs.",
            "- tRPC is the dominant application protocol, with batched queries used heavily for dashboard hydration and polling.",
            "- Trigger.dev is the observable asynchronous orchestration layer for at least product ingestion, and likely other long-running work represented by trigger run IDs.",
            "- Creative generation is versioned: creative → version → variation, with prompt/model metadata repeated at multiple levels for display and history.",
            "- Prompt generation is strategy-led rather than a single free-form user prompt: campaign objective, audience, framework, brand/product data, references, and design constraints are composed into a long final image prompt.",
            "- `full_step` provides the clearest evidence for brand/product onboarding through campaign generation; the specialized HARs contribute alternate objectives/modes and additional prompt outputs.",
            "",
            "## Machine-readable appendix",
            "",
            f"The normalized extraction is available at `{args.json_output.as_posix()}`. It includes file statistics, endpoint evidence, prompt records, model/provider observations, and the full-step event timeline without request headers or secrets.",
            "",
        ]
    )

    report_output = args.root / args.report_output
    report_output.write_text("\n".join(lines), encoding="utf-8")
    print(
        json.dumps(
            {
                "files": len(file_summaries),
                "entries": total_entries,
                "endpoints": len(endpoint_list),
                "creative_prompts": len(creative_list),
                "additional_prompt_fields": len(generic_list),
                "model_values": len(model_list),
                "json_output": str(json_output),
                "report_output": str(report_output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
