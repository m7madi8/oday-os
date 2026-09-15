"""Generate Android/Expo launcher assets from the official ODAY OS mark."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_MARK_LIGHT = ROOT.parent / "dashboard" / "src" / "assets" / "oday-mark-light.png"
SRC_MARK_DARK = ROOT.parent / "dashboard" / "src" / "assets" / "oday-mark.png"
SRC_LOCKUP_LIGHT = ROOT.parent / "dashboard" / "src" / "assets" / "oday-logo-light.png"
OUT = ROOT / "assets" / "images"
BRAND = ROOT / "assets" / "brand"
GRAPHITE = (17, 18, 20, 255)
SIZE = 1024


def contain(src: Image.Image, box: int) -> Image.Image:
    image = src.convert("RGBA")
    image.thumbnail((box, box), Image.Resampling.LANCZOS)
    return image


def paste_centered(canvas: Image.Image, overlay: Image.Image) -> None:
    x = (canvas.width - overlay.width) // 2
    y = (canvas.height - overlay.height) // 2
    canvas.alpha_composite(overlay, (x, y))


def graphite_canvas(size: int = SIZE) -> Image.Image:
    return Image.new("RGBA", (size, size), GRAPHITE)


def write(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG")
    print(f"wrote {path} {image.size}")


def main() -> None:
    mark_light = Image.open(SRC_MARK_LIGHT)
    mark_dark = Image.open(SRC_MARK_DARK)
    lockup_light = Image.open(SRC_LOCKUP_LIGHT)

    BRAND.mkdir(parents=True, exist_ok=True)
    mark_light.save(BRAND / "oday-mark-light.png")
    mark_dark.save(BRAND / "oday-mark.png")
    lockup_light.save(BRAND / "oday-logo-light.png")

    # Classic / iOS-style 1024 icon: official mark on Graphite, no stretch.
    icon = graphite_canvas()
    paste_centered(icon, contain(mark_light, 720))
    write(OUT / "icon.png", icon)

    # Adaptive foreground: transparent, logo inside the 66% safe zone (~672px).
    foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    paste_centered(foreground, contain(mark_light, 640))
    write(OUT / "android-icon-foreground.png", foreground)

    background = graphite_canvas()
    write(OUT / "android-icon-background.png", background)

    # Themed / monochrome: official mark as a light silhouette.
    mono = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    paste_centered(mono, contain(mark_light, 640))
    write(OUT / "android-icon-monochrome.png", mono)

    splash = graphite_canvas()
    paste_centered(splash, contain(lockup_light, 760))
    write(OUT / "splash-icon.png", splash)

    favicon = graphite_canvas(192)
    paste_centered(favicon, contain(mark_light, 140))
    write(OUT / "favicon.png", favicon)


if __name__ == "__main__":
    main()
