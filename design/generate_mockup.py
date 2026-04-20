"""
Langford International Institute — Dashboard Mockup v3
Dark theme · Glassmorphism · 3D Charts · Red/Black/White brand
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Rectangle, Wedge
from matplotlib.font_manager import FontProperties, fontManager
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import matplotlib.patheffects as pe
import matplotlib.colors as mcolors
import numpy as np
import os

# ── Fonts ─────────────────────────────────────────────────────────────────────
FONTS = "/Users/ahmadalsayed/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/49ed3c10-40b5-44c7-8286-14f517a3069c/1013594e-f248-406a-ace0-05bb2d6fac74/skills/canvas-design/canvas-fonts"
for fname in os.listdir(FONTS):
    if fname.endswith(".ttf"):
        fontManager.addfont(os.path.join(FONTS, fname))

def fp(family="Instrument Sans", style="normal", weight="normal", size=10):
    return FontProperties(family=family, style=style, weight=weight, size=size)

# ── Palette ───────────────────────────────────────────────────────────────────
BG        = "#0C0C0C"
PANEL     = "#161616"
GLASS     = "#1E1E1E"
GLASS2    = "#242424"
BORDER    = "#2E2E2E"
RED       = "#D42020"
RED_GLOW  = "#FF3333"
RED_DIM   = "#8B1111"
WHITE     = "#FFFFFF"
GRAY1     = "#E0E0E0"
GRAY2     = "#888888"
GRAY3     = "#444444"
GREEN     = "#22C55E"
AMBER     = "#F59E0B"
SIDEBAR_W = 0.145

# ── Canvas ────────────────────────────────────────────────────────────────────
W, H = 24, 14
fig = plt.figure(figsize=(W, H), facecolor=BG, dpi=160)

# Main axes
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
ax.set_facecolor(BG)

# ── Background texture — subtle grid ─────────────────────────────────────────
for gx in np.arange(0, W, 1.2):
    ax.plot([gx, gx], [0, H], color=BORDER, lw=0.15, alpha=0.25, zorder=0)
for gy in np.arange(0, H, 1.2):
    ax.plot([0, W], [gy, gy], color=BORDER, lw=0.15, alpha=0.25, zorder=0)

# Radial red glow top-right
from matplotlib.patches import Circle
for r, a in [(6, 0.055), (4, 0.08), (2, 0.10), (1, 0.10)]:
    ax.add_patch(Circle((W, H), r * 2.5, color=RED, alpha=a, zorder=0))

# ── Helpers ───────────────────────────────────────────────────────────────────
def glass_card(a, x, y, w, h, r=0.2, alpha=1.0, border_alpha=0.18, zorder=3):
    # shadow
    for i in range(8, 0, -1):
        a.add_patch(FancyBboxPatch((x + i*0.018, y - i*0.025), w, h,
            boxstyle=f"round,pad=0,rounding_size={r}",
            facecolor="#000000", edgecolor="none",
            alpha=0.06 * (i/8), zorder=zorder - 1))
    a.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={r}",
        facecolor=GLASS, edgecolor=BORDER,
        linewidth=0.6, alpha=alpha, zorder=zorder))
    # top highlight line
    a.add_patch(FancyBboxPatch((x + 0.08, y + h - 0.045), w - 0.16, 0.045,
        boxstyle=f"round,pad=0,rounding_size=0.04",
        facecolor="#FFFFFF", edgecolor="none", alpha=0.04, zorder=zorder + 1))

def red_pill(a, x, y, text, size=6.5, zorder=5):
    tw = len(text) * 0.068 + 0.22
    a.add_patch(FancyBboxPatch((x, y - 0.11), tw, 0.24,
        boxstyle="round,pad=0,rounding_size=0.08",
        facecolor=RED, edgecolor="none", alpha=0.18, zorder=zorder))
    a.text(x + tw/2, y + 0.01, text, color=RED_GLOW,
           ha="center", va="center", fontsize=size, zorder=zorder+1,
           fontproperties=fp("Instrument Sans", size=size))

# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════
sw = SIDEBAR_W * W
ax.add_patch(Rectangle((0, 0), sw, H, facecolor=PANEL, zorder=4))
ax.add_patch(Rectangle((sw - 0.02, 0), 0.02, H, facecolor=RED, alpha=0.7, zorder=5))

# Logo area
ax.add_patch(Rectangle((0, H - 1.4), sw, 1.4, facecolor="#0A0A0A", zorder=5))
ax.add_patch(Rectangle((0, H - 1.4), sw, 1.4, facecolor=RED, alpha=0.04, zorder=5))

# Logo mark — stylised "L" with glow
lx, ly = 0.36, H - 0.82
ax.add_patch(Circle((lx + 0.24, ly + 0.05), 0.32, color=RED, alpha=0.18, zorder=6))
ax.add_patch(FancyBboxPatch((lx, ly - 0.24), 0.48, 0.48,
    boxstyle="round,pad=0,rounding_size=0.07",
    facecolor=RED, edgecolor="none", zorder=6))
# Glow outline
ax.add_patch(FancyBboxPatch((lx - 0.03, ly - 0.27), 0.54, 0.54,
    boxstyle="round,pad=0,rounding_size=0.09",
    facecolor="none", edgecolor=RED_GLOW, linewidth=0.6, alpha=0.4, zorder=6))
ax.text(lx + 0.24, ly + 0.01, "L", color=WHITE, fontsize=14,
        ha="center", va="center", zorder=7,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=14))

ax.text(lx + 0.48 + 0.14, H - 0.7, "LANGFORD",
        color=WHITE, fontsize=9.5, ha="left", va="center", zorder=6,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=9.5))
ax.text(lx + 0.48 + 0.14, H - 1.0, "International Institute",
        color=GRAY2, fontsize=5.5, ha="left", va="center", zorder=6,
        fontproperties=fp("Instrument Sans", size=5.5))

# Nav items
nav = [
    ("◉", "Dashboard",  True),
    ("◈", "Students",   False),
    ("⬡", "Pipeline",   False),
    ("◎", "Payments",   False),
    ("⬕", "Courses",    False),
    ("⊞", "Schedule",   False),
    ("⊟", "Reports",    False),
    ("⚙", "Settings",   False),
]
ny0 = H - 2.05
nstep = 0.78

for i, (icon, label, active) in enumerate(nav):
    ny = ny0 - i * nstep
    if active:
        # Active pill
        ax.add_patch(FancyBboxPatch((0.16, ny - 0.25), sw - 0.32, 0.52,
            boxstyle="round,pad=0,rounding_size=0.1",
            facecolor=RED, edgecolor="none", alpha=0.15, zorder=5))
        ax.add_patch(Rectangle((0, ny - 0.25), 0.06, 0.52,
            facecolor=RED, zorder=5))
        col, wcol = RED_GLOW, WHITE
    else:
        col, wcol = GRAY3, GRAY2

    ax.text(0.58, ny + 0.015, icon, color=wcol if active else GRAY3,
            fontsize=9, ha="center", va="center", zorder=6,
            fontproperties=fp("Instrument Sans", size=9))
    ax.text(0.88, ny + 0.015, label, color=WHITE if active else GRAY2,
            fontsize=7.8, ha="left", va="center", zorder=6,
            fontproperties=fp("Instrument Sans",
                              weight="bold" if active else "normal", size=7.8))

# User tile
ax.add_patch(FancyBboxPatch((0.18, 0.35), sw - 0.36, 0.55,
    boxstyle="round,pad=0,rounding_size=0.1",
    facecolor=GLASS2, edgecolor=BORDER, linewidth=0.5, zorder=5))
ax.add_patch(Circle((0.56, 0.625), 0.18, color=RED, zorder=6))
ax.text(0.56, 0.628, "A", color=WHITE, fontsize=8,
        ha="center", va="center", zorder=7,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=8))
ax.text(0.88, 0.70, "Ahmad Al-Sayed", color=GRAY1, fontsize=6.2,
        ha="left", va="center", zorder=6,
        fontproperties=fp("Instrument Sans", size=6.2))
ax.text(0.88, 0.54, "Administrator", color=GRAY2, fontsize=5.5,
        ha="left", va="center", zorder=6,
        fontproperties=fp("Instrument Sans", size=5.5))
# Online dot
ax.add_patch(Circle((sw - 0.28, 0.54), 0.06, color=GREEN, zorder=7))

# ═══════════════════════════════════════════════════════════════════════════════
# TOPBAR
# ═══════════════════════════════════════════════════════════════════════════════
mx  = sw
mw  = W - mx
pad = 0.58
tbh = 1.12

ax.add_patch(Rectangle((mx, H - tbh), mw, tbh, facecolor=PANEL, zorder=3))
ax.plot([mx, W], [H - tbh, H - tbh], color=BORDER, lw=0.5, zorder=4)

ax.text(mx + pad, H - 0.47, "Dashboard",
        color=WHITE, fontsize=15, ha="left", va="center", zorder=4,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=15))
ax.text(mx + pad, H - 0.80,
        "Thursday, 16 April 2026   ·   Academic Year 2025–26",
        color=GRAY2, fontsize=7, ha="left", va="center", zorder=4,
        fontproperties=fp("Instrument Sans", size=7))

# Search bar
sx = W - 5.4
ax.add_patch(FancyBboxPatch((sx, H - 0.76), 2.6, 0.44,
    boxstyle="round,pad=0,rounding_size=0.12",
    facecolor=GLASS2, edgecolor=BORDER, linewidth=0.5, zorder=4))
ax.text(sx + 0.22, H - 0.545, "⌕", color=GRAY2, fontsize=9, zorder=5)
ax.text(sx + 0.5, H - 0.545, "Search students...", color=GRAY3,
        fontsize=7, ha="left", va="center", zorder=5,
        fontproperties=fp("Instrument Sans", size=7))

# Notification
ax.add_patch(FancyBboxPatch((W - 2.5, H - 0.76), 0.44, 0.44,
    boxstyle="round,pad=0,rounding_size=0.1",
    facecolor=GLASS2, edgecolor=BORDER, linewidth=0.5, zorder=4))
ax.text(W - 2.28, H - 0.54, "🔔", fontsize=9.5, ha="center", va="center", zorder=5)
ax.add_patch(Circle((W - 2.1, H - 0.37), 0.1, color=RED, zorder=6))
ax.text(W - 2.1, H - 0.37, "3", color=WHITE, fontsize=4.5,
        ha="center", va="center", zorder=7,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=4.5))

# Avatar
ax.add_patch(Circle((W - 1.85, H - tbh/2), 0.26, color=RED, alpha=0.2, zorder=4))
ax.add_patch(Circle((W - 1.85, H - tbh/2), 0.22, color=RED, zorder=5))
ax.text(W - 1.85, H - tbh/2, "A", color=WHITE, fontsize=9.5,
        ha="center", va="center", zorder=6,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=9.5))

# ═══════════════════════════════════════════════════════════════════════════════
# KPI CARDS
# ═══════════════════════════════════════════════════════════════════════════════
total_w = mw - 2 * pad
kpi_y   = H - tbh - 0.44 - 1.46
kpi_h   = 1.46
gap     = 0.30
cw      = (total_w - 3 * gap) / 4

kpis = [
    ("Total Students",    "247",     "+12 this month",   RED,    "◈", 0.31),
    ("Monthly Revenue",   "KD 12,450","+8.4% vs last mo", GREEN,  "◎", 0.82),
    ("Active Follow-ups", "18",      "Due this week",    AMBER,  "⬡", 0.55),
    ("Active Courses",    "9",       "3 starting soon",  "#60A5FA","⬕",0.72),
]

for i, (title, val, sub, color, icon, pct) in enumerate(kpis):
    cx = mx + pad + i * (cw + gap)
    glass_card(ax, cx, kpi_y, cw, kpi_h, r=0.2, zorder=3)

    # Left accent stripe
    ax.add_patch(FancyBboxPatch((cx, kpi_y), 0.07, kpi_h,
        boxstyle="round,pad=0,rounding_size=0.04",
        facecolor=color, edgecolor="none", alpha=0.9, zorder=5))

    # Icon bg glow
    ax.add_patch(Circle((cx + 0.55, kpi_y + 0.92), 0.32,
                         color=color, alpha=0.12, zorder=4))
    ax.add_patch(Circle((cx + 0.55, kpi_y + 0.92), 0.22,
                         color=color, alpha=0.18, zorder=4))
    ax.text(cx + 0.55, kpi_y + 0.93, icon, color=color, fontsize=13,
            ha="center", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=13))

    ax.text(cx + 1.02, kpi_y + 1.14, title, color=GRAY2, fontsize=7.2,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=7.2))
    ax.text(cx + 1.02, kpi_y + 0.70, val, color=WHITE, fontsize=18,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Bricolage Grotesque", weight="bold", size=18))

    # Mini progress bar
    bar_x = cx + 0.18
    bar_w = cw - 0.26
    ax.add_patch(FancyBboxPatch((bar_x, kpi_y + 0.28), bar_w, 0.09,
        boxstyle="round,pad=0,rounding_size=0.04",
        facecolor=GLASS2, edgecolor="none", zorder=4))
    ax.add_patch(FancyBboxPatch((bar_x, kpi_y + 0.28), bar_w * pct, 0.09,
        boxstyle="round,pad=0,rounding_size=0.04",
        facecolor=color, edgecolor="none", alpha=0.8, zorder=5))

    ax.text(cx + 1.02, kpi_y + 0.16, sub, color=color, fontsize=6.2,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=6.2))

# ═══════════════════════════════════════════════════════════════════════════════
# ROW 2: 3D Revenue Chart + Donut + Pipeline
# ═══════════════════════════════════════════════════════════════════════════════
r2_y    = kpi_y - 0.36 - 3.2
r2_h    = 3.2
chart3d_w = total_w * 0.50
donut_w   = total_w * 0.22
pipe_w    = total_w - chart3d_w - donut_w - 2 * gap

# ── 3D Bar Chart card ──────────────────────────────────────────────────────────
glass_card(ax, mx + pad, r2_y, chart3d_w, r2_h, r=0.2, zorder=3)

ax.text(mx + pad + 0.42, r2_y + r2_h - 0.42, "Revenue Overview",
        color=WHITE, fontsize=9.8, ha="left", va="center", zorder=5,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=9.8))
ax.text(mx + pad + 0.42, r2_y + r2_h - 0.72,
        "Monthly course fees & IELTS  —  last 6 months",
        color=GRAY2, fontsize=6.4, ha="left", va="center", zorder=5,
        fontproperties=fp("Instrument Sans", size=6.4))

# Total badge
red_pill(ax, mx + pad + chart3d_w - 1.85, r2_y + r2_h - 0.55,
         "▲ KD 14,250 Apr", size=6.5, zorder=5)

# 3D axes
ax_3d = fig.add_axes(
    [(mx + pad + 0.3) / W,
     (r2_y + 0.3) / H,
     (chart3d_w - 0.7) / W,
     (r2_h - 1.05) / H],
    projection="3d"
)
ax_3d.set_facecolor(GLASS)
ax_3d.patch.set_alpha(0)
ax_3d.grid(False)
ax_3d.xaxis.pane.fill = False
ax_3d.yaxis.pane.fill = False
ax_3d.zaxis.pane.fill = False
ax_3d.xaxis.pane.set_edgecolor(BORDER)
ax_3d.yaxis.pane.set_edgecolor(BORDER)
ax_3d.zaxis.pane.set_edgecolor(BORDER)
ax_3d.xaxis.pane.set_alpha(0.25)
ax_3d.yaxis.pane.set_alpha(0.25)
ax_3d.zaxis.pane.set_alpha(0.25)

months   = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]
fees     = [9200,  10100, 8800,  11500, 10900, 12450]
ielts    = [1100,  1300,  950,   1600,  1250,  1800]
x_pos    = np.arange(len(months))
bw, bd   = 0.35, 0.35

def make_bar_3d(ax3, x, y, z, dx, dy, dz, color, alpha=0.88):
    verts = [
        [(x, y, 0),      (x+dx, y, 0),      (x+dx, y, dz),      (x, y, dz)],
        [(x, y+dy, 0),   (x+dx, y+dy, 0),   (x+dx, y+dy, dz),   (x, y+dy, dz)],
        [(x, y, 0),      (x, y+dy, 0),       (x, y+dy, dz),      (x, y, dz)],
        [(x+dx, y, 0),   (x+dx, y+dy, 0),   (x+dx, y+dy, dz),   (x+dx, y, dz)],
        [(x, y, dz),     (x+dx, y, dz),      (x+dx, y+dy, dz),   (x, y+dy, dz)],
    ]
    face_colors = [
        mcolors.to_rgba(color, alpha * 0.65),
        mcolors.to_rgba(color, alpha * 0.50),
        mcolors.to_rgba(color, alpha * 0.75),
        mcolors.to_rgba(color, alpha * 0.60),
        mcolors.to_rgba(color, alpha),
    ]
    poly = Poly3DCollection(verts, zsort='min')
    poly.set_facecolor(face_colors)
    poly.set_edgecolor(mcolors.to_rgba(color, 0.25))
    poly.set_linewidth(0.3)
    ax3.add_collection3d(poly)

for xi, (f, il) in enumerate(zip(fees, ielts)):
    make_bar_3d(ax_3d, xi - bw, 0,  0, bw, bd, f/1000,  RED,      0.90)
    make_bar_3d(ax_3d, xi,      0,  0, bw, bd, il/1000, "#60A5FA", 0.85)

# Glow on latest month
for _ in range(3):
    make_bar_3d(ax_3d, x_pos[-1] - bw, 0, 0, bw, bd,
                fees[-1]/1000, RED_GLOW, 0.10)

ax_3d.set_xlim(-0.8, len(months) - 0.2)
ax_3d.set_ylim(-0.2, 1.2)
ax_3d.set_zlim(0, 18)
ax_3d.set_xticks(x_pos)
ax_3d.set_xticklabels(months, color=GRAY2, fontsize=7)
ax_3d.set_yticks([])
ax_3d.zaxis.set_tick_params(labelcolor=GRAY2, labelsize=6.5)
ax_3d.zaxis.set_major_formatter(
    matplotlib.ticker.FuncFormatter(lambda v, _: f"KD {int(v)}k"))
for axis in [ax_3d.xaxis, ax_3d.yaxis, ax_3d.zaxis]:
    axis.line.set_color(BORDER)
ax_3d.view_init(elev=22, azim=-52)
ax_3d.set_box_aspect([2.2, 0.5, 1])

# Legend
lx = mx + pad + 0.42
ly = r2_y + 0.28
for lbl, col in [("Course Fees", RED), ("IELTS", "#60A5FA")]:
    ax.add_patch(FancyBboxPatch((lx, ly - 0.065), 0.2, 0.13,
        boxstyle="round,pad=0,rounding_size=0.04",
        facecolor=col, edgecolor="none", alpha=0.85, zorder=5))
    ax.text(lx + 0.28, ly + 0.005, lbl, color=GRAY2, fontsize=6.2, zorder=5,
            fontproperties=fp("Instrument Sans", size=6.2))
    lx += 1.18

# ── Donut chart card ──────────────────────────────────────────────────────────
dx = mx + pad + chart3d_w + gap
glass_card(ax, dx, r2_y, donut_w, r2_h, r=0.2, zorder=3)

ax.text(dx + donut_w/2, r2_y + r2_h - 0.42, "Student Status",
        color=WHITE, fontsize=8.5, ha="center", va="center", zorder=5,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=8.5))

# Donut
do_ax = fig.add_axes(
    [(dx + 0.28)/W, (r2_y + 0.7)/H, (donut_w - 0.56)/W, (r2_h - 1.35)/H]
)
do_ax.set_facecolor("none")
do_ax.axis("off")

seg_vals  = [89, 61, 38, 24, 35]
seg_cols  = [RED, "#60A5FA", GREEN, "#A78BFA", GRAY3]
seg_lbls  = ["Lead", "Contacted", "Enrolled", "Paid", "Other"]
wedges, _ = do_ax.pie(
    seg_vals, colors=seg_cols, startangle=90,
    wedgeprops=dict(width=0.52, edgecolor=BG, linewidth=2),
    counterclock=False
)
for w in wedges:
    w.set_linewidth(1.8)

do_ax.text(0, 0, "247", ha="center", va="center", fontsize=16,
           color=WHITE, fontproperties=fp("Bricolage Grotesque", weight="bold", size=16))
do_ax.text(0, -0.28, "students", ha="center", va="center", fontsize=7,
           color=GRAY2, fontproperties=fp("Instrument Sans", size=7))

# Legend inside card
for j, (lbl, col, val) in enumerate(zip(seg_lbls, seg_cols, seg_vals)):
    legy = r2_y + 0.70 - j * 0.35 + (len(seg_lbls) - 1) * 0.175
    ax.add_patch(Circle((dx + 0.38, legy), 0.07, color=col, zorder=5))
    ax.text(dx + 0.55, legy + 0.005, lbl, color=GRAY1, fontsize=6.2,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=6.2))
    ax.text(dx + donut_w - 0.25, legy + 0.005, str(val), color=col,
            fontsize=6.2, ha="right", va="center", zorder=5,
            fontproperties=fp("Bricolage Grotesque", weight="bold", size=6.5))

# ── Pipeline card ──────────────────────────────────────────────────────────────
px2 = dx + donut_w + gap
glass_card(ax, px2, r2_y, pipe_w, r2_h, r=0.2, zorder=3)

ax.text(px2 + 0.38, r2_y + r2_h - 0.42, "Sales Pipeline",
        color=WHITE, fontsize=8.5, ha="left", va="center", zorder=5,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=8.5))
ax.text(px2 + 0.38, r2_y + r2_h - 0.72, "Conversion funnel",
        color=GRAY2, fontsize=6.2, ha="left", va="center", zorder=5,
        fontproperties=fp("Instrument Sans", size=6.2))

funnel = [
    ("Lead",      89,  RED,      1.00),
    ("Contacted", 61,  "#EF4444",0.82),
    ("Evaluated", 38,  AMBER,    0.66),
    ("Enrolled",  24,  GREEN,    0.50),
    ("Paid",      19,  "#60A5FA",0.36),
]
fy0   = r2_y + r2_h - 1.05
fstep = 0.40
fmaxw = pipe_w - 0.76
fbh   = 0.26

for k, (lbl, val, col, pct) in enumerate(funnel):
    fy   = fy0 - k * fstep
    bw_f = fmaxw * pct
    bx_f = px2 + 0.38 + (fmaxw - bw_f) / 2

    # Track
    ax.add_patch(FancyBboxPatch((px2 + 0.38, fy - fbh/2), fmaxw, fbh,
        boxstyle="round,pad=0,rounding_size=0.08",
        facecolor=GLASS2, edgecolor="none", zorder=4))
    # Fill
    ax.add_patch(FancyBboxPatch((bx_f, fy - fbh/2), bw_f, fbh,
        boxstyle="round,pad=0,rounding_size=0.08",
        facecolor=col, edgecolor="none", alpha=0.85, zorder=5))
    # Glow top edge
    ax.add_patch(FancyBboxPatch((bx_f, fy + fbh/2 - 0.035), bw_f, 0.035,
        boxstyle="round,pad=0,rounding_size=0.04",
        facecolor=col, edgecolor="none", alpha=0.4, zorder=6))

    ax.text(px2 + 0.38 + fmaxw/2, fy, f"{lbl}  {val}",
            color=WHITE, fontsize=7, ha="center", va="center", zorder=7,
            fontproperties=fp("Instrument Sans", size=7))

# Conversion rate
cr = round(19/89*100)
ax.text(px2 + pipe_w/2, r2_y + 0.28, f"{cr}% overall conversion rate",
        color=GRAY2, fontsize=6.3, ha="center", va="center", zorder=5,
        fontproperties=fp("Instrument Sans", size=6.3))

# ═══════════════════════════════════════════════════════════════════════════════
# ROW 3: Follow-ups Table + Activity Feed
# ═══════════════════════════════════════════════════════════════════════════════
r3_y  = r2_y - 0.34 - 2.52
r3_h  = 2.52
tbl_w = total_w * 0.60
act_w = total_w - tbl_w - gap

# Follow-ups
glass_card(ax, mx + pad, r3_y, tbl_w, r3_h, r=0.2, zorder=3)

ax.text(mx + pad + 0.42, r3_y + r3_h - 0.42, "Upcoming Follow-ups",
        color=WHITE, fontsize=9.5, ha="left", va="center", zorder=5,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=9.5))

# Badge
bx = mx + pad + 0.42 + 2.22
ax.add_patch(FancyBboxPatch((bx, r3_y + r3_h - 0.58), 0.42, 0.26,
    boxstyle="round,pad=0,rounding_size=0.08",
    facecolor=AMBER, edgecolor="none", alpha=0.2, zorder=5))
ax.add_patch(FancyBboxPatch((bx - 0.01, r3_y + r3_h - 0.59), 0.44, 0.28,
    boxstyle="round,pad=0,rounding_size=0.09",
    facecolor="none", edgecolor=AMBER, linewidth=0.5, alpha=0.4, zorder=5))
ax.text(bx + 0.21, r3_y + r3_h - 0.45, "18",
        color=AMBER, fontsize=7.5, ha="center", va="center", zorder=6,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=7.5))

# Table header
th_y = r3_y + r3_h - 0.95
ax.add_patch(Rectangle((mx + pad + 0.18, th_y - 0.05), tbl_w - 0.36, 0.34,
    facecolor=GLASS2, zorder=4))
headers = ["Student", "Type", "Due Date", "Assigned To", "Status"]
hxs = [0.42, 2.5, 4.0, 5.5, 7.0]
for hxi, hdr in zip(hxs, headers):
    ax.text(mx + pad + hxi, th_y + 0.115, hdr.upper(),
            color=GRAY2, fontsize=5.8, ha="left", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=5.8))

rows = [
    ("Fatima Al-Rashidi", "Follow-up",  "Today",    "Sara M.",  "Urgent",  RED,   True),
    ("Mohammed Al-Azmi",  "Evaluation", "Tomorrow", "Ahmad K.", "Pending", AMBER, False),
    ("Nour Al-Hamdan",    "Follow-up",  "Apr 18",   "Sara M.",  "Pending", AMBER, False),
    ("Khalid Mansour",    "Payment",    "Apr 19",   "Yasmin T.","Pending", AMBER, False),
]
rh = 0.44
for ri, (name, typ, date, who, status, sc, highlight) in enumerate(rows):
    ry = th_y - 0.32 - ri * rh
    if highlight:
        ax.add_patch(Rectangle(
            (mx + pad + 0.18, ry - 0.12), tbl_w - 0.36, rh - 0.06,
            facecolor=RED, alpha=0.06, zorder=3))
        ax.add_patch(Rectangle(
            (mx + pad + 0.18, ry - 0.12), 0.05, rh - 0.06,
            facecolor=RED, alpha=0.7, zorder=4))
    elif ri % 2 == 0:
        ax.add_patch(Rectangle(
            (mx + pad + 0.18, ry - 0.12), tbl_w - 0.36, rh - 0.06,
            facecolor=GLASS2, alpha=0.5, zorder=3))

    vals = [name, typ, date, who]
    for xi, v in zip(hxs[:4], vals):
        is_name = (xi == hxs[0])
        ax.text(mx + pad + xi, ry + 0.09, v,
                color=WHITE if is_name else GRAY1,
                fontsize=7.2 if is_name else 6.8,
                ha="left", va="center", zorder=5,
                fontproperties=fp(
                    "Bricolage Grotesque" if is_name else "Instrument Sans",
                    weight="bold" if is_name else "normal",
                    size=7.2 if is_name else 6.8))

    bpw = 0.72
    ax.add_patch(FancyBboxPatch((mx + pad + hxs[4], ry - 0.005), bpw, 0.24,
        boxstyle="round,pad=0,rounding_size=0.07",
        facecolor=sc, edgecolor="none", alpha=0.15, zorder=5))
    ax.add_patch(FancyBboxPatch((mx + pad + hxs[4] - 0.01, ry - 0.015), bpw + 0.02, 0.26,
        boxstyle="round,pad=0,rounding_size=0.08",
        facecolor="none", edgecolor=sc, linewidth=0.4, alpha=0.4, zorder=5))
    ax.text(mx + pad + hxs[4] + bpw/2, ry + 0.115, status,
            color=sc, fontsize=6.5, ha="center", va="center", zorder=6,
            fontproperties=fp("Instrument Sans", size=6.5))

    ax.plot([mx + pad + 0.28, mx + pad + tbl_w - 0.28],
            [ry - 0.13, ry - 0.13], color=BORDER, lw=0.3, zorder=4)

# Activity
ax2 = mx + pad + tbl_w + gap
glass_card(ax, ax2, r3_y, act_w, r3_h, r=0.2, zorder=3)

ax.text(ax2 + 0.38, r3_y + r3_h - 0.42, "Recent Activity",
        color=WHITE, fontsize=9.5, ha="left", va="center", zorder=5,
        fontproperties=fp("Bricolage Grotesque", weight="bold", size=9.5))

activities = [
    ("◎", RED,       "Payment received",       "Fatima · KD 180",    "2m"),
    ("◈", "#60A5FA", "New student enrolled",    "Mohammed · B2",      "14m"),
    ("⬡", AMBER,     "Follow-up completed",     "Nour · Sara",        "1h"),
    ("◈", GREEN,     "Level updated",           "Sara · A1 → A2",     "3h"),
    ("⊟", "#A78BFA", "Report generated",        "Ahmad · Apr 2026",   "5h"),
]
ay0   = r3_y + r3_h - 0.94
astep = 0.34

for ai, (icon, col, title, detail, time) in enumerate(activities):
    ay = ay0 - ai * astep

    ax.add_patch(Circle((ax2 + 0.52, ay + 0.09), 0.18, color=col, alpha=0.18, zorder=4))
    ax.add_patch(Circle((ax2 + 0.52, ay + 0.09), 0.13, color=col, alpha=0.25, zorder=4))
    ax.text(ax2 + 0.52, ay + 0.10, icon, color=col, fontsize=9,
            ha="center", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=9))

    ax.text(ax2 + 0.84, ay + 0.23, title, color=WHITE, fontsize=7.2,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Bricolage Grotesque", weight="bold", size=7.2))
    ax.text(ax2 + 0.84, ay + 0.04, detail, color=GRAY2, fontsize=6.2,
            ha="left", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=6.2))
    ax.text(ax2 + act_w - 0.3, ay + 0.23, f"{time} ago", color=GRAY3,
            fontsize=5.8, ha="right", va="center", zorder=5,
            fontproperties=fp("Instrument Sans", size=5.8))

    if ai < len(activities) - 1:
        ax.plot([ax2 + 0.52, ax2 + act_w - 0.3],
                [ay - 0.09, ay - 0.09], color=BORDER, lw=0.3, alpha=0.6, zorder=4)

# ── Section labels ─────────────────────────────────────────────────────────────
for label, y in [
    ("K E Y   M E T R I C S", kpi_y - 0.26),
    ("A N A L Y T I C S",     r2_y  - 0.24),
    ("A C T I V I T Y",       r3_y  - 0.22),
]:
    ax.text(mx + pad, y, label, color=GRAY3, fontsize=5.6,
            ha="left", va="center", zorder=4,
            fontproperties=fp("Instrument Sans", size=5.6))
    ax.plot([mx + pad + len(label) * 0.058 + 0.2, mx + pad + total_w],
            [y, y], color=BORDER, lw=0.3, alpha=0.4, zorder=3)

# ── Bottom watermark ──────────────────────────────────────────────────────────
ax.text(W/2, 0.18, "LANGFORD INTERNATIONAL INSTITUTE  ·  KUWAIT  ·  2026",
        color=GRAY3, fontsize=5.5, ha="center", va="center", zorder=4, alpha=0.5,
        fontproperties=fp("Instrument Sans", size=5.5))

# ── Save ──────────────────────────────────────────────────────────────────────
out_pdf = "/Users/ahmadalsayed/Desktop/langford_system/design/langford_dashboard.pdf"
out_png = "/Users/ahmadalsayed/Desktop/langford_system/design/langford_dashboard.png"
fig.savefig(out_pdf, format="pdf", bbox_inches="tight", dpi=160, facecolor=BG)
fig.savefig(out_png, format="png", bbox_inches="tight", dpi=160, facecolor=BG)
print(f"Saved: {out_pdf}")
print(f"Saved: {out_png}")
