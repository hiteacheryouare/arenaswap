#!/usr/bin/env python3
"""Emit the landing page proposal. Cards and charts are generated so the four
game cards stay identical in structure and the SVG charts stay on one scale."""
import io
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.body.html')


# ── PowerScore colour, ported from gameCardShared.powerScoreColor ────────────
def ps_color(score, max_score=100):
    ratio = min(score / max_score, 1)
    r = round(139 + (247 - 139) * ratio)
    g = round(148 + (92 - 148) * ratio)
    b = round(158 + (3 - 158) * ratio)
    return 'rgb(%d,%d,%d)' % (r, g, b)


# ── The four hero cards ──────────────────────────────────────────────────────
# away/home team colours are the real ESPN primaries the extension resolves.
CARDS = [
    dict(i=0, league='NBA', away='BOS', home='NYK', away_c='#007A33', home_c='#006BB6',
         a=96, h=99, clock='4:12', period='3rd', ps=58, ot=False, innings=False,
         venue='Madison Square Garden', nets='ESPN', tab='Tab 1: ESPN'),
    dict(i=1, league='MLB', away='MIA', home='PHI', away_c='#00A3E0', home_c='#E81828',
         a=2, h=4, clock=None, period='Inn 7', ps=78, ot=False, innings=True,
         venue='Citizens Bank Park', nets='ESPN+', tab='Tab 2: ESPN+'),
    dict(i=2, league='NHL', away='COL', home='EDM', away_c='#6F263D', home_c='#041E42',
         a=1, h=5, clock='8:20', period='3rd', ps=22, ot=False, innings=False,
         venue='Rogers Place', nets='TNT', tab='Tab 3: TNT'),
]


def team_col(abbr, colour, star=False):
    return (
        '<div class="gc-team">'
        '<span class="gc-logo" style="background:%s">%s</span>'
        '<span class="gc-abbr">%s</span>'
        '<span class="gc-star%s">%s</span>'
        '</div>'
    ) % (colour, abbr, abbr, ' on' if star else '', '&#9733;' if star else '&#9734;')


def diamond(first, second, third):
    return (
        '<span class="gc-diamond" aria-hidden="true">'
        '<span class="gc-base gc-base-2%s">&#9670;</span>'
        '<span class="gc-base gc-base-3%s">&#9670;</span>'
        '<span class="gc-base gc-base-1%s">&#9670;</span>'
        '</span>'
    ) % (' on' if second else '', ' on' if third else '', ' on' if first else '')


def bso(balls, strikes, outs):
    def dots(n, total):
        return ''.join('<span class="gc-bso-dot%s">&#9679;</span>' % (' on' if k < n else '')
                       for k in range(total))
    return (
        '<span class="gc-bso">'
        '<span class="gc-bso-lab">B</span>%s'
        '<span class="gc-bso-lab">S</span>%s'
        '<span class="gc-bso-lab">O</span>%s'
        '</span>'
    ) % (dots(balls, 3), dots(strikes, 2), dots(outs, 2))


def card(c, in_popup=False):
    """One live game card, structured exactly as liveGameCard.tsx renders it."""
    colour = ps_color(c['ps'])
    centre = ['<div class="gc-scores">',
              '<span class="gc-score" data-role="away">%d</span>' % c['a']]
    centre.append(diamond(True, False, True) if c['innings'] else '<span class="gc-sep"></span>')
    centre.append('<span class="gc-score" data-role="home">%d</span>' % c['h'])
    centre.append('</div>')
    if not c['innings']:
        centre.append('<span class="gc-clock" data-role="clock">%s</span>' % c['clock'])
    centre.append('<span class="gc-period" data-role="period">%s</span>' % c['period'])
    if c['innings']:
        centre.append(bso(2, 1, 1))

    star_away = c['home'] == 'PHI' and c['league'] == 'MLB'
    return (
        '<div class="gc%s" style="--away:%s;--home:%s;--away-wash:%s28;--home-wash:%s28"'
        ' data-card="%d">'
        '<div class="gc-live"><span class="gc-dot"></span>Live</div>'
        '<div class="gc-matchup">%s'
        '<div class="gc-center">%s</div>'
        '%s</div>'
        '<div class="gc-meta">'
        '<span class="gc-venue">%s</span>'
        '<span class="gc-nets"><b>%s</b></span>'
        '</div>'
        '<div class="gc-ps">'
        '<span class="gc-ps-lab">PowerScore</span>'
        '<div class="gc-ps-track"><div class="gc-ps-bar" data-role="bar"'
        ' style="width:%d%%;background-color:%s"></div></div>'
        '<span class="gc-ps-val" data-role="val" style="color:%s">%d / 100</span>'
        '</div>'
        '%s'
        '</div>'
    ) % (
        ' is-ot' if c['ot'] else '',
        c['away_c'], c['home_c'], c['away_c'], c['home_c'], c['i'],
        team_col(c['away'], c['away_c']),
        ''.join(centre),
        team_col(c['home'], c['home_c'], star=star_away),
        c['venue'], c['nets'],
        c['ps'], colour, colour, c['ps'],
        '' if in_popup else
        '<div class="gc-tab"><span class="gc-select">%s</span></div>' % c['tab'],
    )


def hero_row():
    slots = []
    for c in CARDS:
        on = c['i'] == 1
        slots.append(
            '<div class="hs-slot%s" data-slot="%d">'
            '<span class="hs-flag"><i></i>%s</span>%s</div>'
            % (' on' if on else '', c['i'],
               'On your screen' if on else c['league'],
               card(c))
        )
    return '\n'.join(slots)


# ── Charts, drawn as SVG on the extension's own axis colours ─────────────────
AXIS = '#8b949e'
AXIS_LINE = 'rgba(71,85,105,0.95)'
SPLIT = 'rgba(71,85,105,0.34)'
W, H = 520, 132
PAD_L, PAD_R, PAD_T, PAD_B = 30, 8, 10, 20


def scale(vals, lo=None, hi=None):
    lo = min(vals) if lo is None else lo
    hi = max(vals) if hi is None else hi
    if hi == lo:
        hi = lo + 1
    n = len(vals)
    pts = []
    for k, v in enumerate(vals):
        x = PAD_L + (W - PAD_L - PAD_R) * (k / (n - 1))
        y = PAD_T + (H - PAD_T - PAD_B) * (1 - (v - lo) / (hi - lo))
        pts.append((x, y))
    return pts


def grid(labels, ticks):
    out = []
    for frac, lab in ticks:
        y = PAD_T + (H - PAD_T - PAD_B) * (1 - frac)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1"/>'
                   % (PAD_L, y, W - PAD_R, y, SPLIT))
        out.append('<text x="%.1f" y="%.1f" fill="%s" font-size="9" font-family="Lekton,monospace"'
                   ' text-anchor="end">%s</text>' % (PAD_L - 5, y + 3, AXIS, lab))
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1"/>'
               % (PAD_L, H - PAD_B, W - PAD_R, H - PAD_B, AXIS_LINE))
    n = len(labels)
    for k, lab in enumerate(labels):
        x = PAD_L + (W - PAD_L - PAD_R) * (k / (n - 1))
        out.append('<text x="%.1f" y="%.1f" fill="%s" font-size="9" font-family="Lekton,monospace"'
                   ' text-anchor="middle">%s</text>' % (x, H - PAD_B + 12, AXIS, lab))
    return ''.join(out)


def line(vals, colour, lo=None, hi=None, area=False):
    pts = scale(vals, lo, hi)
    d = 'M' + ' L'.join('%.1f %.1f' % p for p in pts)
    out = ''
    if area:
        out += ('<path d="%s L%.1f %.1f L%.1f %.1f Z" fill="%s" opacity="0.14"/>'
                % (d, pts[-1][0], H - PAD_B, pts[0][0], H - PAD_B, colour))
    out += '<path d="%s" fill="none" stroke="%s" stroke-width="2" stroke-linejoin="round"/>' % (d, colour)
    return out


TIMES = ['7:05', '7:20', '7:35', '7:50', '8:05', '8:20']
PS_SERIES = [41, 52, 58, 64, 71, 84]
AWAY_SERIES = [18, 44, 58, 80, 96, 108]
HOME_SERIES = [21, 38, 64, 76, 102, 111]
WINP_HOME = [52, 46, 58, 55, 63, 71]

SIGNALS = [
    ('Closeness', '#22c55e', [10, 14, 17, 20, 24, 28]),
    ('Late-game', '#f75c03', [4, 7, 11, 15, 21, 26]),
    ('Momentum', '#2274a5', [14, 18, 15, 12, 14, 16]),
    ('Lead changes', '#f1c40f', [4, 6, 8, 9, 10, 11]),
    ('Comeback', '#d90368', [2, 3, 4, 5, 5, 6]),
]


def chart_line(title, sub, series, ticks, legend=None, lo=0, hi=100):
    body = ['<svg viewBox="0 0 %d %d" role="img" aria-label="%s">' % (W, H, title)]
    body.append(grid(TIMES, ticks))
    for vals, colour, area in series:
        body.append(line(vals, colour, lo, hi, area))
    body.append('</svg>')
    leg = ''
    if legend:
        leg = '<div class="ch-legend">%s</div>' % ''.join(
            '<span><i style="background:%s"></i>%s</span>' % (c, n) for n, c in legend)
    return ('<div class="ch"><div class="ch-t">%s</div><div class="ch-s">%s</div>%s%s</div>'
            % (title, sub, ''.join(body), leg))


def chart_stack():
    """PowerScore components over time: the stacked-bar option, same five colours."""
    n = len(TIMES)
    inner_w = W - PAD_L - PAD_R
    bw = inner_w / n * 0.52
    body = ['<svg viewBox="0 0 %d %d" role="img" aria-label="PowerScore components over time">' % (W, H)]
    body.append(grid(TIMES, [(0, '0'), (0.5, '50'), (1, '100')]))
    for k in range(n):
        cx = PAD_L + inner_w * (k / (n - 1))
        base = 0
        for _name, colour, vals in SIGNALS:
            v = vals[k]
            y0 = PAD_T + (H - PAD_T - PAD_B) * (1 - base / 100)
            y1 = PAD_T + (H - PAD_T - PAD_B) * (1 - (base + v) / 100)
            body.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
                        % (cx - bw / 2, y1, bw, max(y0 - y1, 0.6), colour))
            base += v
    body.append('</svg>')
    leg = '<div class="ch-legend">%s</div>' % ''.join(
        '<span><i style="background:%s"></i>%s</span>' % (c, n) for n, c, _ in SIGNALS)
    return ('<div class="ch"><div class="ch-t">PowerScore components over time</div>'
            '<div class="ch-s">Stacked to the total</div>%s%s</div>'
            % (''.join(body), leg))


def charts():
    return '\n'.join([
        chart_line('PowerScore over time', 'One line, 0 to 100',
                   [(PS_SERIES, '#F75C03', True)],
                   [(0, '0'), (0.5, '50'), (1, '100')]),
        # The shipped option leaves yAxis on auto min/max rather than forcing zero,
        # which is the only way two teams three points apart read as two lines.
        chart_line('Game score over time', 'Both teams',
                   [(AWAY_SERIES, '#007A33', False), (HOME_SERIES, '#006BB6', False)],
                   [(0, '14'), (0.5, '64'), (1, '114')],
                   legend=[('BOS', '#007A33'), ('NYK', '#006BB6')], lo=14, hi=114),
        chart_line('Win probability', 'Per cent, home',
                   [(WINP_HOME, '#006BB6', True)],
                   [(0, '0'), (0.5, '50'), (1, '100')]),
        chart_stack(),
    ])


# ── The popup ────────────────────────────────────────────────────────────────
def popup():
    inner = [card(CARDS[0], in_popup=True), card(CARDS[1], in_popup=True)]
    return (
        '<div class="pu">'
        '<div class="pu-head"><span class="w">Arena<span>Swap</span></span>'
        '<span class="i"><span class="g">Tour</span><span class="g">Settings</span>'
        '<span class="s"></span></span></div>'
        '<div class="pu-body">'
        '<div class="pu-sec">Active Tabs</div>'
        '<div class="pu-league"><span class="d" style="background:#1d428a"></span>NBA</div>'
        '<div class="pu-stack">%s</div>'
        '<div class="pu-league" style="margin-top:12px">'
        '<span class="d" style="background:#041e42"></span>MLB</div>'
        '<div class="pu-stack">%s</div>'
        '<div class="pu-sec gap">Up Next</div>'
        '<div class="pu-league"><span class="d" style="background:#013369"></span>'
        'NFL &nbsp;&middot;&nbsp; 4 games today</div>'
        '</div>'
        '<div class="pu-foot">Enable auto-switching<b>ON</b></div>'
        '</div>'
    ) % (inner[0], inner[1])


# ── Settings ─────────────────────────────────────────────────────────────────
# Names and descriptions are the shipped strings from locales/en.json setup.group*.
GROUPS = [
    ('Switching', 'How eager ArenaSwap is to move you to a better game.'),
    ('Scoring', 'Which signals feed a PowerScore, and what earns bonus points.'),
    ('Leagues', 'Which leagues get tracked, and the order they appear in.'),
    ('Display', 'What shows up on the main screen.'),
    ('Standby Stream', 'Where to park you when every game goes quiet.'),
    ('Demo mode', 'Scripted games, so you can watch a switch happen on demand.'),
]


def settings_list():
    return '\n'.join(
        '<div class="st-item"><h4>%s<span>.</span></h4><p>%s</p></div>' % (name, desc)
        for name, desc in GROUPS
    )


def settings_panel():
    def dots(on, total=7):
        return '<span class="st-dots">%s</span>' % ''.join(
            '<span class="st-dot%s"></span>' % (' on' if k < on else '') for k in range(total))
    rows = [
        ('Sensitivity', dots(4)),
        ('Switch cooldown', '<span class="v">45s</span>'),
        ('Switch delay', '<span class="v">Off</span>'),
        ('Favorite team bonus', '<span class="v">+10</span>'),
        ('Postseason boost', '<span class="v">+5</span>'),
        ('Switch notifications', '<span class="st-toggle on"></span>'),
        ('Standby Stream', '<span class="st-toggle"></span>'),
    ]
    return ('<div class="st-panel"><div class="st-panel-h">Switching</div>%s</div>'
            % ''.join('<div class="st-row"><span class="l">%s</span>%s</div>' % r for r in rows))


LEAGUES = [
    ('Basketball', ['NBA', 'WNBA', 'NCAA Men&rsquo;s', 'NCAA Women&rsquo;s']),
    ('Football', ['NFL', 'NCAA Football', 'UFL']),
    ('Hockey', ['NHL', 'NCAA Men&rsquo;s']),
    ('Baseball', ['MLB', 'NCAA Baseball', 'NCAA Softball', 'World Baseball Classic']),
    ('Soccer', ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Liga MX', 'MLS', 'NWSL',
                'Champions League', 'Europa League', 'FIFA World Cup',
                'FIFA Women&rsquo;s World Cup']),
    ('Olympics', ['Basketball (M)', 'Basketball (W)', 'Hockey (M)', 'Hockey (W)',
                  'Soccer (M)', 'Soccer (W)', 'Baseball']),
]


def leagues():
    return '\n'.join(
        '<div class="lg-col"><h4>%s</h4><ul>%s</ul></div>'
        % (sport, ''.join('<li>%s</li>' % n for n in names))
        for sport, names in LEAGUES
    )


def main():
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('<!-- HERO_ROW -->\n' + hero_row())
        fh.write('\n<!-- POPUP -->\n' + popup())
        fh.write('\n<!-- CHARTS -->\n' + charts())
        fh.write('\n<!-- SETTINGS_LIST -->\n' + settings_list())
        fh.write('\n<!-- SETTINGS_PANEL -->\n' + settings_panel())
        fh.write('\n<!-- LEAGUES -->\n' + leagues())
    print('wrote', OUT)


if __name__ == '__main__':
    main()
