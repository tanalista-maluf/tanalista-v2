import sys, os
from PIL import Image
src, repo = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
BG = (8, 22, 15)
BBOX = (258, 304, 1003, 939)  # desenho, sem o fundo

# Recorte com fundo transparente: alfa pela distância até a cor de fundo,
# desfazendo a mistura com o fundo nas bordas suavizadas
def cutout(img):
    out = Image.new('RGBA', img.size)
    sp, dp = img.load(), out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            p = sp[x, y]
            d = max(abs(p[i] - BG[i]) for i in range(3))
            a = min(1.0, max(0.0, (d - 6) / 110))
            if a <= 0:
                dp[x, y] = (0, 0, 0, 0)
                continue
            c = tuple(max(0, min(255, round((p[i] - (1 - a) * BG[i]) / a))) for i in range(3))
            dp[x, y] = c + (round(a * 255),)
    return out

cut = cutout(im)
art = cut.crop(BBOX)  # 745x635

def centered(canvas_size, art_width, color=(0, 0, 0, 0), source=art):
    w = art_width; h = round(source.size[1] * w / source.size[0])
    canvas = Image.new('RGBA', (canvas_size, canvas_size), color)
    canvas.alpha_composite(source.resize((w, h), Image.LANCZOS), ((canvas_size - w) // 2, (canvas_size - h) // 2))
    return canvas

def white(img):
    r, g, b, a = img.split()
    return Image.merge('RGBA', (r.point(lambda _: 255), g.point(lambda _: 255), b.point(lambda _: 255), a))

mob = os.path.join(repo, 'mobile/assets/images')
pub = os.path.join(repo, 'public')

# App: iOS (opaco, sem transparência) e ícone padrão
full = im.resize((1024, 1024), Image.LANCZOS)
full.save(os.path.join(mob, 'icon.png'))
# Android adaptativo: desenho dentro da zona segura (círculo de 66%)
centered(1024, 425).save(os.path.join(mob, 'android-icon-foreground.png'))
white(centered(1024, 425)).save(os.path.join(mob, 'android-icon-monochrome.png'))
# Abertura do app (sobre o fundo #0D1A14) e favicon da versão web
centered(512, 512).save(os.path.join(mob, 'splash-icon.png'))
im.resize((96, 96), Image.LANCZOS).save(os.path.join(mob, 'favicon.png'))
# Marca usada nas telas (ao lado do nome), quadrada e sem fundo
mark = centered(256, 256)
mark.save(os.path.join(mob, 'logo-mark.png'))
mark.save(os.path.join(pub, 'logo-mark.png'))

# Site: PWA, favicon e selo das notificações
for s in (72, 96, 128, 192, 384, 512):
    im.resize((s, s), Image.LANCZOS).save(os.path.join(pub, f'icon-{s}.png'))
im.resize((180, 180), Image.LANCZOS).save(os.path.join(pub, 'apple-touch-icon.png'))
im.resize((32, 32), Image.LANCZOS).save(os.path.join(pub, 'favicon-32.png'))
# O Next só lê .ico com PNG em RGBA
im.convert('RGBA').save(os.path.join(repo, 'src/app/favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
# Selo: só a silhueta branca (o Android pinta)
white(centered(96, 80)).save(os.path.join(pub, 'badge-96.png'))
print('ok')
