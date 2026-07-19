"""Build production brand derivatives from the approved gallery masters.

The generated files are committed so production does not depend on the external
gallery path. Re-run this script only when the approved masters change.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(
    r"C:\Users\eddya\Documents\Codex\2026-07-16\se\outputs"
    r"\title-favicon-gallery\assets-current"
)
OUTPUT = ROOT / "assets" / "brand"

DT = {
    "canvas": "#f6f3f2",
    "soft": "#e9e8e5",
    "emboss": "#ccc3bc",
    "border": "#ab9e94",
    "accent": "#786a5e",
    "strong": "#6a5b50",
    "ink": "#292522",
}

OMM = {
    "black": "#000402",
    "dark": "#01130a",
    "surface": "#0b1710",
    "green": "#04e26d",
    "green_dark": "#00592a",
    "mint": "#5dfeaa",
    "white": "#fefefe",
    "light": "#f4f5f1",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(source: Path, filename: str) -> Path:
    path = source / filename
    if not path.is_file():
        raise FileNotFoundError(f"Missing approved brand master: {path}")
    return path


def contain(image: Image.Image, size: tuple[int, int], padding: int = 0) -> Image.Image:
    target = Image.new("RGBA", size, (0, 0, 0, 0))
    inner = (max(1, size[0] - padding * 2), max(1, size[1] - padding * 2))
    layer = image.copy()
    layer.thumbnail(inner, Image.Resampling.LANCZOS)
    target.alpha_composite(layer, ((size[0] - layer.width) // 2, (size[1] - layer.height) // 2))
    return target


def flattened_icon(image: Image.Image, size: int, background: str, padding: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), background)
    layer = contain(image, (size, size), padding)
    base.alpha_composite(layer)
    return base.convert("RGB")


def micro_icon(image: Image.Image, size: int) -> Image.Image:
    icon = contain(image, (size, size))
    if size <= 32:
        icon = icon.filter(ImageFilter.UnsharpMask(radius=0.65, percent=145, threshold=2))
    return icon


def save_icon_family(source_icon: Path, destination: Path, background: str) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    master = Image.open(source_icon).convert("RGBA")

    micro_icon(master, 512).save(destination / "mark-512.png", optimize=True)
    flattened_icon(master, 192, background, 3).save(destination / "mark-192.png", optimize=True)
    flattened_icon(master, 180, background, 3).save(destination / "mark-180.png", optimize=True)
    micro_icon(master, 32).save(destination / "mark-32.png", optimize=True)
    micro_icon(master, 16).save(destination / "mark-16.png", optimize=True)

    favicon_frames = [micro_icon(master, size).convert("RGBA") for size in (16, 32, 48)]
    favicon_frames[0].save(
        destination / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=favicon_frames[1:],
    )


def omen_poster(button_path: Path) -> Image.Image:
    button = Image.open(button_path).convert("RGBA")
    # The approved idle button contains the same canonical singular logo lockup.
    # Crop only the identity, excluding the run-through-specific Start 01 control.
    crop = button.crop((20, 20, 420, 145))
    canvas = Image.new("RGBA", (1000, 300), OMM["light"])
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (3, 3, 996, 296),
        radius=34,
        fill=OMM["light"],
        outline="#b6b2ad",
        width=3,
    )
    target_width = 760
    target_height = round(crop.height * target_width / crop.width)
    crop = crop.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(crop, ((canvas.width - crop.width) // 2, (canvas.height - crop.height) // 2))
    return canvas


def paste_contained(base: Image.Image, layer: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    fitted = contain(layer, (x1 - x0, y1 - y0))
    base.alpha_composite(fitted, (x0, y0))


def draw_omen_grid(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], step: int = 42) -> None:
    x0, y0, x1, y1 = box
    for x in range(x0, x1 + 1, step):
        draw.line((x, y0, x, y1), fill=(4, 226, 109, 52), width=2)
    for y in range(y0, y1 + 1, step):
        draw.line((x0, y, x1, y), fill=(4, 226, 109, 52), width=2)


def social_demo(wordmark: Image.Image) -> Image.Image:
    card = Image.new("RGBA", (1200, 630), DT["ink"])
    draw = ImageDraw.Draw(card, "RGBA")
    draw.ellipse((-160, -350, 700, 510), fill=(120, 106, 94, 32))
    draw.ellipse((680, 230, 1400, 950), fill=(204, 195, 188, 20))
    draw.rounded_rectangle((74, 92, 1126, 538), radius=44, outline=DT["accent"], width=3)
    paste_contained(card, wordmark, (120, 190, 1080, 440))
    return card


def social_omen(poster: Image.Image) -> Image.Image:
    card = Image.new("RGBA", (1200, 630), OMM["black"])
    draw = ImageDraw.Draw(card, "RGBA")
    draw_omen_grid(draw, (610, 0, 1200, 630), 42)
    draw.rectangle((590, 0, 607, 630), fill=OMM["green"])
    paste_contained(card, poster, (110, 160, 1090, 470))
    return card


def social_shared(wordmark: Image.Image, poster: Image.Image) -> Image.Image:
    card = Image.new("RGBA", (1200, 630), DT["ink"])
    draw = ImageDraw.Draw(card, "RGBA")
    draw.rectangle((600, 0, 1200, 630), fill=OMM["black"])
    draw_omen_grid(draw, (760, 0, 1200, 630), 48)
    draw.rectangle((593, 0, 607, 630), fill=OMM["green"])
    paste_contained(card, wordmark, (70, 205, 545, 420))
    paste_contained(card, poster, (660, 190, 1140, 430))
    return card


def social_mvp(wordmark: Image.Image) -> Image.Image:
    card = social_demo(wordmark)
    draw = ImageDraw.Draw(card, "RGBA")
    draw.rounded_rectangle((430, 470, 770, 530), radius=30, fill=DT["canvas"], outline=DT["border"], width=2)
    # Use the existing product label without introducing new proposal copy.
    draw.text((600, 500), "LIVE DEMO MVP", fill=DT["strong"], anchor="mm")
    return card


def build(source: Path) -> None:
    dt_dir = OUTPUT / "demothemis"
    omm_dir = OUTPUT / "omenmarketmaker"
    social_dir = OUTPUT / "social"
    for directory in (dt_dir, omm_dir, social_dir):
        directory.mkdir(parents=True, exist_ok=True)

    dt_wordmark_source = require(source, "DemoThemisLogo.png")
    dt_icon_source = require(source, "DemoThemisFavicon.png")
    omm_rive_source = require(source, "OmenMarketMakerLogo.riv")
    omm_icon_source = require(source, "OmenMarketMakerFavicon.png")
    omm_button_source = require(source, "OmenMarketMakerButtonIdle.png")

    shutil.copy2(dt_wordmark_source, dt_dir / "wordmark.png")
    shutil.copy2(omm_rive_source, omm_dir / "wordmark.riv")
    save_icon_family(dt_icon_source, dt_dir, DT["canvas"])
    save_icon_family(omm_icon_source, omm_dir, OMM["black"])

    poster = omen_poster(omm_button_source)
    poster.save(omm_dir / "wordmark-poster.png", optimize=True)

    wordmark = Image.open(dt_wordmark_source).convert("RGBA")
    social_demo(wordmark).convert("RGB").save(social_dir / "demothemis-1200x630.jpg", quality=88, optimize=True)
    social_omen(poster).convert("RGB").save(social_dir / "omenmarketmaker-1200x630.jpg", quality=88, optimize=True)
    social_shared(wordmark, poster).convert("RGB").save(social_dir / "proposal-home-1200x630.jpg", quality=88, optimize=True)
    social_shared(wordmark, poster).convert("RGB").save(social_dir / "shared-system-1200x630.jpg", quality=88, optimize=True)
    social_mvp(wordmark).convert("RGB").save(social_dir / "mvp-1200x630.jpg", quality=88, optimize=True)

    approved = {
        filename: {
            "sha256": sha256(require(source, filename)),
            "production_use": use,
        }
        for filename, use in {
            "DemoThemisLogo.png": "DemoThemis wordmark",
            "DemoThemisFavicon.png": "DemoThemis icon master",
            "OmenMarketMakerLogo.riv": "OmenMarketMaker animated wordmark",
            "OmenMarketMakerFavicon.png": "OmenMarketMaker icon master",
            "OmenMarketMakerButtonIdle.png": "Static Omen wordmark poster source only",
        }.items()
    }
    manifest = {
        "source": "approved assets-current gallery",
        "canonical_names": ["DemoThemis", "OmenMarketMaker"],
        "button_state_assets_deployed": False,
        "palette": {"demothemis": DT, "omenmarketmaker": OMM},
        "masters": approved,
    }
    (OUTPUT / "brand-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    build(args.source.resolve())


if __name__ == "__main__":
    main()
