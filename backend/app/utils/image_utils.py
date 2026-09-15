import io

from PIL import Image, UnidentifiedImageError

MAX_IMAGE_PIXELS = 64_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def decode_image(data: bytes) -> Image.Image:
    """Decode and validate raw upload bytes into an RGB PIL image.

    Raises ValueError with a user-friendly message for invalid input.
    Validates by content (magic bytes via Pillow), not by file extension.
    """
    if not data:
        raise ValueError("The uploaded file is empty.")

    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            if fmt not in ALLOWED_FORMATS:
                raise ValueError(
                    "Unsupported image format. Please upload a JPG, PNG or WEBP image."
                )
            if img.width * img.height > MAX_IMAGE_PIXELS:
                raise ValueError("The image is too large. Please upload a smaller image.")
            img.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        if isinstance(exc, ValueError):
            raise
        raise ValueError("The uploaded file is not a valid image.") from exc

    try:
        with Image.open(io.BytesIO(data)) as img:
            return img.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a valid image.") from exc