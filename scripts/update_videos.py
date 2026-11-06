"""Index every public channel upload without downloading media or using API keys."""
import json
import pathlib
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]


def channel_url(settings):
    url = settings.get("channelUrl", "").rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ("www.youtube.com", "youtube.com"):
        raise ValueError("Configurá una dirección HTTPS de YouTube válida.")
    path = re.sub(r"/(videos|shorts|streams|featured)/?$", "", parsed.path)
    if not re.fullmatch(r"/(@[\w.-]+|channel/UC[\w-]{22}|c/[\w.-]+|user/[\w.-]+)", path):
        raise ValueError("Configurá la dirección del canal, no la de un video.")
    return "https://www.youtube.com" + path


def fetch_catalog(url):
    from yt_dlp import YoutubeDL
    # A channel root traverses videos, Shorts and streams, including continuations.
    with YoutubeDL({
        "extract_flat": True,
        "skip_download": True,
        "quiet": True,
        "retries": 3,
        "extractor_retries": 3,
        "socket_timeout": 30,
        "http_headers": {"Accept-Language": "es-AR,es;q=0.9"},
        "extractor_args": {
            "youtube": {"lang": ["es"]},
            "youtubetab": {"lang": ["es"], "approximate_date": ["true"]},
        },
    }) as youtube:
        return youtube.extract_info(url, download=False)


def entries(info):
    if not isinstance(info, dict):
        return
    if "entries" in info:
        for child in info["entries"] or []:
            yield from entries(child)
    else:
        yield info


def refresh(root=ROOT, fetch=None):
    folder = root / "public/data"
    target = folder / "videos.json"
    settings = json.loads((folder / "settings.json").read_text(encoding="utf-8"))
    previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"items": [], "updatedAt": None}
    try:
        catalog = (fetch or fetch_catalog)(channel_url(settings))
        items = {}
        for video in entries(catalog):
            vid = video.get("id", "")
            if not re.fullmatch(r"[\w-]{11}", vid) or not video.get("title"):
                continue
            if video.get("availability") in ("private", "premium_only", "subscriber_only", "needs_auth"):
                continue
            timestamp = video.get("timestamp") or video.get("release_timestamp")
            date = datetime.fromtimestamp(timestamp, timezone.utc).isoformat() if timestamp else ""
            items[vid] = {
                "id": vid, "title": video["title"],
                "description": video.get("description") or "",
                "date": date,
                "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            }
        if not items:
            raise ValueError("YouTube no devolvió videos públicos; se conserva el catálogo anterior.")
        data = {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "error": None,
            "items": sorted(items.values(), key=lambda video: video["date"], reverse=True),
        }
    except Exception as exc:
        data = {**previous, "error": str(exc)}
        print("Aviso: se conservan los videos anteriores.", str(exc))
    temp = target.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(target)
    return data


if __name__ == "__main__":
    result = refresh()
    print(f"Videos disponibles: {len(result['items'])}")
    if result.get("error"):
        raise SystemExit(1)
