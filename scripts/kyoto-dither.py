import os

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

def prepare_plate(input_path, width=420, invert=False):
    # 1. Cargar y redimensionar (un ancho de ~400px hace que los puntos sean visibles y nítidos)
    img = ImageOps.exif_transpose(Image.open(input_path)).convert("L")
    aspect_ratio = img.height / img.width
    new_height = int(width * aspect_ratio)
    img = img.resize((width, new_height), Image.Resampling.LANCZOS)

    # 2. Subir contraste para separar luces y sombras
    img = ImageEnhance.Contrast(img).enhance(1.6)
    pixels = np.array(img, dtype=np.float32) / 255.0
    # El canvas trata lo claro como tinta. El bonsai llega oscuro sobre fondo claro.
    if invert:
        pixels = 1.0 - pixels

    # 3. Aplicar viñeta suave para que los bordes se fundan con el fondo #070B09
    y, x = np.ogrid[:new_height, :width]
    center_x, center_y = width / 2.0, new_height / 2.0
    dist = np.sqrt(((x - center_x) / (width * 0.55)) ** 2 + ((y - center_y) / (new_height * 0.55)) ** 2)
    vignette = np.clip(1.15 - dist, 0.0, 1.0)
    pixels = pixels * vignette
    # Lo casi negro debe quedar en cero: si no, el Bayer enciende el fondo.
    pixels = np.clip((pixels - 0.055) / 0.945, 0.0, 1.0)
    return pixels, new_height

def save_source_webp(input_path, output_path, width=440, invert=False, max_bytes=15_000):
    """Escala de grises para que el canvas aplique el Bayer en el navegador."""
    pixels, new_height = prepare_plate(input_path, width, invert)
    plate = Image.fromarray(np.clip(pixels * 255.0, 0, 255).astype(np.uint8), mode="L")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    quality = 82
    plate.save(output_path, "WEBP", quality=quality, method=6)
    while os.path.getsize(output_path) > max_bytes and quality > 28:
        quality -= 6
        plate.save(output_path, "WEBP", quality=quality, method=6)
    size = os.path.getsize(output_path)
    print(f"Listo: {output_path} ({width}x{new_height}px, {size} bytes, q={quality})")

def apply_kyoto_dither(input_path, output_path, width=420, invert=False):
    pixels, new_height = prepare_plate(input_path, width, invert)

    # 4. Matriz Bayer 4x4 (trama ordenada estilo Ryoku)
    bayer = np.array([
        [ 0,  8,  2, 10],
        [12,  4, 14,  6],
        [ 3, 11,  1,  9],
        [15,  7, 13,  5]
    ], dtype=np.float32) / 16.0

    threshold = np.tile(bayer, (new_height // 4 + 1, width // 4 + 1))[:new_height, :width]
    mask = pixels > threshold

    # 5. Colorear con tu paleta Kyoto (#070B09 fondo, #9CB8A4 puntos salvia)
    out = np.zeros((new_height, width, 3), dtype=np.uint8)
    out[~mask] = [7, 11, 9]       # --bg-base: #070B09
    out[mask]  = [156, 184, 164]  # Puntos verde salvia: #9CB8A4

    Image.fromarray(out).save(output_path)
    print(f"Listo: {output_path} ({width}x{new_height}px)")

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sources = os.path.join(root, "scripts", "sources")
    art = os.path.join(root, "public", "art")
    save_source_webp(os.path.join(sources, "torii-raw.png"), os.path.join(art, "torii.webp"))
    save_source_webp(os.path.join(sources, "bonsai-raw.jpg"), os.path.join(art, "pine.webp"), invert=True)
