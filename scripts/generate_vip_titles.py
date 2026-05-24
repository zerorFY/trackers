from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "docs" / "assets"
OUT_DIR = ASSET_DIR / "titles"
MASCOT_PATH = ASSET_DIR / "item-2.png"

PEOPLE = ["Sophia", "Freya", "Lora", "Mia", "Theodore"]

WIDTH = 840
HEIGHT = 340
SCALE = 2


def scaled(value):
    return int(value * SCALE)


def font(path, size):
    return ImageFont.truetype(str(path), scaled(size))


FONT_DIR = Path("C:/Windows/Fonts")
TITLE_FONT = FONT_DIR / "comicbd.ttf"
FALLBACK_FONT = FONT_DIR / "arialbd.ttf"
if not TITLE_FONT.exists():
    TITLE_FONT = FALLBACK_FONT


def draw_heart(draw, center, size, fill, outline=None, width=1):
    x, y = center
    r = size // 4
    points = [
        (x, y + size // 2),
        (x - size // 2, y),
        (x - size // 3, y - size // 3),
        (x, y - size // 8),
        (x + size // 3, y - size // 3),
        (x + size // 2, y),
    ]
    draw.polygon(points, fill=fill, outline=outline)
    draw.ellipse((x - size // 2, y - size // 2, x, y), fill=fill, outline=outline, width=width)
    draw.ellipse((x, y - size // 2, x + size // 2, y), fill=fill, outline=outline, width=width)


def draw_sparkle(draw, center, size, fill, width=3):
    x, y = center
    draw.line((x, y - size, x, y + size), fill=fill, width=width)
    draw.line((x - size, y, x + size, y), fill=fill, width=width)
    draw.line((x - size // 2, y - size // 2, x + size // 2, y + size // 2), fill=fill, width=max(1, width - 1))
    draw.line((x - size // 2, y + size // 2, x + size // 2, y - size // 2), fill=fill, width=max(1, width - 1))


def text_width(draw, text, fnt, stroke_width=0):
    bbox = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    return bbox[2] - bbox[0]


def fit_font(draw, text, max_width, start_size, min_size):
    size = start_size
    while size > min_size:
        candidate = font(TITLE_FONT, size)
        if text_width(draw, text, candidate, stroke_width=scaled(4)) <= scaled(max_width):
            return candidate
        size -= 2
    return font(TITLE_FONT, min_size)


def draw_cloud(base):
    mask = Image.new("L", base.size, 0)
    mask_draw = ImageDraw.Draw(mask)

    shapes = [
        ("rounded", (250, 52, 810, 258), 58),
        ("ellipse", (260, 64, 410, 198), 0),
        ("ellipse", (360, 32, 540, 188), 0),
        ("ellipse", (510, 50, 690, 202), 0),
        ("ellipse", (650, 72, 814, 220), 0),
        ("ellipse", (310, 174, 470, 282), 0),
        ("ellipse", (470, 170, 640, 286), 0),
        ("ellipse", (620, 170, 790, 282), 0),
    ]

    for kind, box, radius in shapes:
        box = tuple(scaled(v) for v in box)
        if kind == "rounded":
            mask_draw.rounded_rectangle(box, radius=scaled(radius), fill=255)
        else:
            mask_draw.ellipse(box, fill=255)

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(scaled(9))))
    shadow_tinted = Image.new("RGBA", base.size, (149, 104, 178, 70))
    shadow_tinted.putalpha(shadow.getchannel("A"))
    base.alpha_composite(shadow_tinted, (scaled(8), scaled(10)))

    fill = Image.new("RGBA", base.size, (255, 245, 253, 248))
    fill.putalpha(mask)
    base.alpha_composite(fill)

    outline = Image.new("RGBA", base.size, (0, 0, 0, 0))
    outline_draw = ImageDraw.Draw(outline)
    for kind, box, radius in shapes:
        box = tuple(scaled(v) for v in box)
        if kind == "rounded":
            outline_draw.rounded_rectangle(box, radius=scaled(radius), outline=(207, 174, 232, 220), width=scaled(4))
        else:
            outline_draw.ellipse(box, outline=(207, 174, 232, 190), width=scaled(4))
    base.alpha_composite(outline)

    draw = ImageDraw.Draw(base)
    for y in (74, 248):
        points = []
        for x in range(300, 780, 28):
            points.append((scaled(x), scaled(y + (7 if (x // 28) % 2 else -2))))
        draw.line(points, fill=(190, 150, 224, 145), width=scaled(3), joint="curve")


def make_title(name):
    canvas = Image.new("RGBA", (scaled(WIDTH), scaled(HEIGHT)), (255, 255, 255, 0))
    draw_cloud(canvas)
    draw = ImageDraw.Draw(canvas)

    mascot = Image.open(MASCOT_PATH).convert("RGBA")
    mascot.thumbnail((scaled(292), scaled(312)), Image.Resampling.LANCZOS)
    sticker = Image.new("RGBA", (scaled(330), scaled(326)), (255, 255, 255, 0))
    sticker.alpha_composite(mascot, ((sticker.width - mascot.width) // 2, scaled(4)))
    sticker = sticker.rotate(-8, resample=Image.Resampling.BICUBIC, expand=True)
    shadow = sticker.filter(ImageFilter.GaussianBlur(scaled(5)))
    shadow_layer = Image.new("RGBA", shadow.size, (96, 55, 116, 48))
    shadow_layer.putalpha(shadow.getchannel("A"))
    canvas.alpha_composite(shadow_layer, (scaled(20), scaled(32)))
    canvas.alpha_composite(sticker, (scaled(12), scaled(18)))

    title = f"{name}'s"
    subtitle = "Kuromi Week"
    title_font = fit_font(draw, title, 430, 76, 52)
    subtitle_font = fit_font(draw, subtitle, 450, 58, 46)

    x = scaled(330)
    y = scaled(78)
    shadow_offset = scaled(7)

    draw.text((x + shadow_offset, y + shadow_offset), title, font=title_font, fill=(164, 126, 210, 130), stroke_width=scaled(4), stroke_fill=(164, 126, 210, 70))
    draw.text((x, y), title, font=title_font, fill=(24, 18, 34, 255), stroke_width=scaled(7), stroke_fill=(255, 255, 255, 255))

    y2 = y + scaled(92)
    draw.text((x + shadow_offset, y2 + shadow_offset), subtitle, font=subtitle_font, fill=(177, 105, 190, 130), stroke_width=scaled(4), stroke_fill=(177, 105, 190, 70))
    draw.text((x, y2), subtitle, font=subtitle_font, fill=(255, 126, 188, 255), stroke_width=scaled(6), stroke_fill=(255, 240, 249, 255))

    draw_sparkle(draw, (scaled(294), scaled(118)), scaled(18), (181, 139, 220, 190), scaled(4))
    draw_sparkle(draw, (scaled(768), scaled(94)), scaled(20), (181, 139, 220, 175), scaled(4))
    draw_sparkle(draw, (scaled(796), scaled(214)), scaled(13), (255, 151, 204, 160), scaled(3))
    draw_heart(draw, (scaled(738), scaled(136)), scaled(34), (245, 171, 224, 80), (166, 125, 208, 150), scaled(3))

    canvas = canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    out = OUT_DIR / f"{name.lower()}-title.png"
    canvas.save(out)
    return out


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for person in PEOPLE:
        print(make_title(person))


if __name__ == "__main__":
    main()
