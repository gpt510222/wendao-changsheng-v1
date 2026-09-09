from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
PORTRAITS = ROOT / "assets" / "qstyle-v2" / "mainline" / "protagonist-wardrobe"
MASTERS = {
    "female": ROOT / "assets" / "qstyle-v2" / "mainline" / "portrait-protagonist-female-v2.png",
    "male": ROOT / "assets" / "qstyle-v2" / "mainline" / "portrait-protagonist-male-v2.png",
}


def connected_background(candidate: np.ndarray) -> np.ndarray:
    height, width = candidate.shape
    mask = Image.fromarray(np.where(candidate, 1, 0).astype(np.uint8), "L")
    draw = ImageDraw.Draw(mask)
    seeds = []
    for x in range(0, width, 48):
        seeds.extend(((x, 0), (x, height - 1)))
    for y in range(0, height, 48):
        seeds.extend(((0, y), (width - 1, y)))
    seeds.extend(((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)))
    for seed in seeds:
        if mask.getpixel(seed) == 1:
            ImageDraw.floodfill(mask, seed, 2, thresh=0)
    return np.asarray(mask) == 2


def remove_generated_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    data = np.asarray(rgba).copy()
    rgb = data[..., :3].astype(np.int16)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green_screen = (green > 150) & (red < 110) & (blue < 130) & (green - np.maximum(red, blue) > 60)
    neutral_checker = ((rgb.max(axis=2) - rgb.min(axis=2)) < 32) & (rgb.mean(axis=2) > 68)
    green_at_corner = bool(green_screen[0, 0] or green_screen[0, -1] or green_screen[-1, 0] or green_screen[-1, -1])
    candidate = green_screen if green_at_corner else neutral_checker
    background = connected_background(candidate) | green_screen
    old_alpha = data[..., 3]
    alpha = np.where(background, 0, old_alpha).astype(np.uint8)
    nearby = np.asarray(Image.fromarray(np.where(background, 255, 0).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(5))) > 0
    dominance = green - np.maximum(red, blue)
    spill = nearby & ~background & (dominance > 10)
    data[..., 1] = np.where(spill, np.maximum(data[..., 0], data[..., 2]), data[..., 1])
    alpha = np.where(spill, np.minimum(alpha, np.clip(280 - dominance * 2, 48, 255)), alpha).astype(np.uint8)
    data[..., 3] = alpha
    return Image.fromarray(data, "RGBA")


def restore_master_face(image: Image.Image, master: Image.Image) -> Image.Image:
    width, height = master.size
    mask = Image.new("L", master.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((int(width * .392), int(height * .282), int(width * .642), int(height * .458)), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(3.0))
    return Image.composite(master, image, mask)


def process(path: Path) -> None:
    gender = path.stem.split("-")[0]
    master = Image.open(MASTERS[gender]).convert("RGBA")
    image = Image.open(path)
    if image.size != master.size:
        image = image.resize(master.size, Image.Resampling.LANCZOS)
    rgba = image.convert("RGBA") if rgba_is_genuinely_transparent(image) else remove_generated_background(image)
    if path.name not in {"female-a1-o1.png", "male-a1-o1.png"} and not rgba_is_genuinely_transparent(image):
        rgba = restore_master_face(rgba, master)
    output = path.with_suffix(".webp")
    temporary = path.with_suffix(".processing.webp")
    rgba.save(temporary, "WEBP", lossless=True, method=6)
    written = Image.open(temporary).convert("RGBA")
    visible = np.asarray(rgba)[..., 3] > 0
    original_pixels = np.asarray(rgba)
    written_pixels = np.asarray(written)
    if not np.array_equal(original_pixels[..., 3], written_pixels[..., 3]):
        raise RuntimeError(f"alpha changed while encoding {path.name}")
    if not np.array_equal(original_pixels[..., :3][visible], written_pixels[..., :3][visible]):
        raise RuntimeError(f"visible pixels changed while encoding {path.name}")
    temporary.replace(output)
    path.unlink()


def rgba_is_genuinely_transparent(image: Image.Image) -> bool:
    if image.mode not in {"RGBA", "LA"} and "transparency" not in image.info:
        return False
    alpha = np.asarray(image.convert("RGBA"))[..., 3]
    return int(alpha.min()) == 0


def main() -> None:
    paths = sorted(PORTRAITS.glob("*.png"))
    expected_stems = {f"{gender}-a{appearance}-o{outfit}" for gender in MASTERS for appearance in range(1, 4) for outfit in range(1, 9)}
    if paths:
        actual_stems = {path.stem for path in paths}
        if actual_stems != expected_stems:
            raise SystemExit(f"portrait matrix mismatch: missing={sorted(expected_stems-actual_stems)}, extra={sorted(actual_stems-expected_stems)}")
        for path in paths:
            process(path)
    outputs = sorted(PORTRAITS.glob("*.webp"))
    output_stems = {path.stem for path in outputs}
    if output_stems != expected_stems:
        raise SystemExit(f"output matrix mismatch: missing={sorted(expected_stems-output_stems)}, extra={sorted(output_stems-expected_stems)}")
    for path in outputs:
        image = Image.open(path).convert("RGBA")
        if image.getextrema()[3][0] != 0:
            raise RuntimeError(f"missing transparent background: {path.name}")
    print(f"validated {len(outputs)} lossless transparent portraits")


if __name__ == "__main__":
    main()
