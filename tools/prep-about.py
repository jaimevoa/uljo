"""Assets for about.html (pass 52). Run from the repo root: python3 tools/prep-about.py"""
from PIL import Image, ImageDraw, ImageOps, ImageEnhance, ImageChops
Image.MAX_IMAGE_PIXELS = None
SRC = '/Users/jaimeolivares/Desktop/Jaimie Olivares/'

# the guitar cut-out (Jaime's edit, tools/ref/2026-09-30/5.webp): lose the 3 px band along
# the top edge and the 1 px line running right from the head (row 1000), round the photo
im = Image.open('tools/ref/2026-09-30/5.webp').convert('RGBA')
W, H = im.size
P = im.load()
for x in range(W):
    for y in range(0, 3):
        P[x, y] = (0, 0, 0, 0)
for x in range(1158, W):                       # the stray line: the average of its neighbours
    a, b = P[x, 999], P[x, 1001]
    P[x, 1000] = tuple((a[i] + b[i]) // 2 for i in range(4))
TOP, R = 1049, 68                               # the dark rectangle starts at y 1049
rounded = Image.new('L', (W, H), 255)
band = Image.new('L', (W, H - TOP), 0)
ImageDraw.Draw(band).rounded_rectangle([0, 0, W - 1, H - TOP - 1], radius=R, fill=255)
rounded.paste(band, (0, TOP))
A = im.getchannel('A')
newA = ImageChops.multiply(A, rounded)
head = Image.new('L', (W, H), 0)               # the head crosses the top edge: leave it whole
ImageDraw.Draw(head).rectangle([860, 700, 1220, TOP + R], fill=255)
im.putalpha(Image.composite(A, newA, head))
im.save('assets/img/about/music-guitar.webp', 'WEBP', quality=84, method=6)
im.resize((1200, 1200), Image.LANCZOS).save('assets/img/about/music-guitar-1200.webp', 'WEBP', quality=82, method=6)

# Desiderium's cover
cv = Image.open(SRC + 'Desiderium.jpg').convert('RGB')
for s in (1200, 640):
    cv.resize((s, s), Image.LANCZOS).save(f'assets/img/about/desiderium-{s}.webp', 'WEBP', quality=86, method=6)

# the video's cover: the same night (Cégeps en spectacle 2024), black and white, 16:9
ph = Image.open(SRC + 'Photo Haute résolution Cégep_en_spectacle_IMG_8060.jpg').convert('RGB')
pw = ph.size[0]
g = ImageOps.grayscale(ph.crop((0, 150, pw, 150 + int(pw * 9 / 16))))
ImageEnhance.Contrast(g).enhance(1.08).resize((1920, 1080), Image.LANCZOS) \
    .save('assets/img/about/cegeps-2024.webp', 'WEBP', quality=80, method=6)

# the header's wordmark, small
Image.open('assets/img/uljo-star.png').convert('RGBA').resize((304, 176), Image.LANCZOS) \
    .save('assets/img/uljo-wordmark.png', optimize=True)
print('ok')
