"""Resize the approved original without cropping, using Pillow/Lanczos."""
from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = root / 'src/assets/iconepwa.png'
original_hash = sha256(source.read_bytes()).hexdigest()
image = Image.open(source).convert('RGBA')
output = root / 'public/icons'
output.mkdir(parents=True, exist_ok=True)
for size in (192, 512, 180, 32):
    # Contain, rather than cover, preserves the entire image if its aspect changes.
    fitted = ImageOps.contain(image, (size, size), Image.Resampling.LANCZOS)
    icon = Image.new('RGBA', (size, size), '#f9d6d2')
    icon.alpha_composite(fitted, ((size-fitted.width)//2, (size-fitted.height)//2))
    target = output / f'caderninho-{size}-20261012-1.png'
    icon.convert('RGB').save(target, optimize=True)
    with Image.open(target) as check:
        assert check.size == (size, size) and check.format == 'PNG'
    print(f'Verified {target.name}: {size}x{size}')
assert sha256(source.read_bytes()).hexdigest() == original_hash
print('Original preserved; no cropping.')
