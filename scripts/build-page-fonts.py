"""Subset the existing Kai typeface to each rendered page and preload it."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import re
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'font-source/FandolKai-Regular.otf'
DIST = ROOT / 'dist'
source_bytes = SOURCE.read_bytes()
coverage = set(TTFont(SOURCE).getBestCmap())

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chars = set()
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('style', 'script'):
            self.hidden += 1
        if not self.hidden:
            for key, value in attrs:
                if key in ('placeholder', 'title', 'aria-label') and value:
                    self.chars.update(map(ord, value))
    def handle_endtag(self, tag):
        if tag in ('style', 'script'):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, text):
        if not self.hidden:
            self.chars.update(map(ord, text))

for page in DIST.rglob('*.html'):
    html = page.read_text()
    parser = VisibleText()
    parser.feed(html)
    # Latin uses Times New Roman; retain all non-ASCII glyphs used on this page.
    chars = sorted(c for c in parser.chars & coverage if c > 127)
    if not chars:
        continue
    key = hashlib.sha256(source_bytes + bytes(str(chars), 'ascii') + b'page-font-v1').hexdigest()[:16]
    filename = f'kai-{key}.woff2'
    target = DIST / 'webfonts' / filename
    if not target.exists():
        font = TTFont(SOURCE)
        options = subset.Options()
        options.flavor = 'woff2'
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=chars)
        sub.subset(font)
        font.flavor = 'woff2'
        font.save(target)
    base = re.search(r'href="([^" ]*)style\.css\?', html).group(1)
    url = base + 'webfonts/' + filename
    css = '@font-face{font-family:"Catobs Page Kai";src:url("' + url + '") format("woff2");font-style:normal;font-weight:400;font-display:swap;}'
    head = f'<link rel="preload" href="{url}" as="font" type="font/woff2" crossorigin><style>{css}</style>'
    html = html.replace('<link rel="stylesheet"', head + '<link rel="stylesheet"', 1)
    page.write_text(html)
    print(f'{page.relative_to(DIST)}: {len(chars)} glyphs, {target.stat().st_size:,} bytes')
