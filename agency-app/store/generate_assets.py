"""Generate the App Store icon and 6.7-inch iPhone screenshots."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SHOTS = Path(__file__).resolve().parent / "screenshots"

BG = (14, 17, 23)
ACCENT = (255, 75, 75)
ACCENT_SOFT = (255, 107, 107)
WHITE = (250, 250, 250)
TEXT_SEC = (196, 200, 212)
TEXT_BODY = (215, 218, 220)
SURFACE = (38, 39, 48)
BORDER = (70, 75, 93)
MUTED = (128, 132, 149)


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path(r"C:\Windows\Fonts") / name), size)


def rounded_rect(draw, box, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_icon():
    size = 1024
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    margin = 118
    d.ellipse((margin, margin, size - margin, size - margin), fill=ACCENT)

    cx, cy = 512, 430
    pr = 168
    d.ellipse((cx - pr, cy - pr, cx + pr, cy + pr), fill=WHITE)
    d.polygon([(cx - 148, cy + 86), (cx + 148, cy + 86), (cx, 812)], fill=WHITE)
    hole = 72
    d.ellipse((cx - hole, cy - hole, cx + hole, cy + hole), fill=ACCENT)

    img.save(ASSETS / "icon.png")
    img.save(ASSETS / "splash-icon.png")
    img.save(ASSETS / "adaptive-icon.png")
    img.resize((48, 48), Image.Resampling.LANCZOS).save(ASSETS / "favicon.png")


def status_bar(d, w):
    d.text((48, 28), "9:41", font=font(34, True), fill=WHITE)
    # Cellular + battery block on the right
    d.rectangle((w - 196, 42, w - 188, 58), fill=WHITE)
    d.rectangle((w - 182, 36, w - 174, 58), fill=WHITE)
    d.rectangle((w - 168, 30, w - 160, 58), fill=WHITE)
    d.rectangle((w - 154, 24, w - 146, 58), fill=WHITE)
    rounded_rect(d, (w - 128, 28, w - 52, 60), 6, None, WHITE, 2)
    d.rectangle((w - 124, 32, w - 72, 56), fill=WHITE)
    d.rectangle((w - 52, 38, w - 46, 50), fill=WHITE)


def draw_picker(d, y, selected="Select a service…"):
    d.text((48, y), "Service", font=font(36, True), fill=TEXT_SEC)
    rounded_rect(d, (48, y + 56, 1242, y + 176), 16, SURFACE, BORDER)
    d.text((72, y + 90), selected, font=font(40), fill=WHITE if selected != "Select a service…" else MUTED)
    d.polygon([(1168,  y + 98), (1196, y + 98), (1182, y + 122)], fill=ACCENT)


def draw_card(d, y, name, address, phone, extra=None):
    height = 280 if extra else 220
    rounded_rect(d, (48, y, 1242, y + height), 16, SURFACE, BORDER)
    d.text((72, y + 28), name, font=font(42, True), fill=WHITE)
    d.text((72, y + 90), address, font=font(34), fill=TEXT_SEC)
    d.text((72, y + 136), phone, font=font(34), fill=TEXT_SEC)
    if extra:
        d.text((72, y + 186), extra, font=font(32), fill=TEXT_BODY)
        d.text((72, y + 230), "See Less", font=font(34, True), fill=ACCENT_SOFT)
        return y + height + 24
    d.text((72, y + 180), "See More Information", font=font(34, True), fill=ACCENT_SOFT)
    return y + height + 24


def screenshot(name, painter):
    w, h = 1290, 2796
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    status_bar(d, w)
    painter(d, w, h)
    SHOTS.mkdir(parents=True, exist_ok=True)
    img.save(SHOTS / name)


def shot_empty(d, w, h):
    d.text((48, 140), "Find Services", font=font(64, True), fill=WHITE)
    draw_picker(d, 250)
    d.text(
        (48, 480),
        "Choose a service above to see agencies\nthat offer it.",
        font=font(36),
        fill=TEXT_SEC,
    )


def shot_results(d, w, h):
    d.text((48, 140), "Find Services", font=font(64, True), fill=WHITE)
    draw_picker(d, 250, "Food Pantry")
    d.text((48, 470), "Agencies (2)", font=font(48, True), fill=WHITE)
    y = 550
    y = draw_card(d, y, "Community Food Bank", "123 Maple Ave, Altoona, PA", "(814) 555-0142")
    draw_card(d, y, "Hope Center", "88 12th Street, Altoona, PA", "(814) 555-0198")


def shot_expanded(d, w, h):
    d.text((48, 140), "Find Services", font=font(64, True), fill=WHITE)
    draw_picker(d, 250, "Housing Assistance")
    d.text((48, 470), "Agencies (1)", font=font(48, True), fill=WHITE)
    draw_card(
        d,
        550,
        "Blair Housing Coalition",
        "415 Union Ave, Altoona, PA",
        "(814) 555-0110",
        extra="Emergency shelter referrals and rental help.",
    )


if __name__ == "__main__":
    make_icon()
    screenshot("01-find-services.png", shot_empty)
    screenshot("02-agency-results.png", shot_results)
    screenshot("03-agency-detail.png", shot_expanded)
    print("Wrote icon and screenshots")
