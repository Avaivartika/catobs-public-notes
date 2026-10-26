"""Regenerate the two GPL-with-font-exception Fandol Kai webfont subsets.

Run after installing fonttools[woff]: python3 scripts/build-fandol-font.py
The original OTF and its license are kept in font-source/.
"""
from pathlib import Path
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'font-source/FandolKai-Regular.otf'
DEST = ROOT / 'site/webfonts'

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, text):
        self.parts.append(text)

common = set()
# GB2312 punctuation and its 3,755 first-level characters cover everyday prose.
for lead in list(range(0xA1, 0xAA)) + list(range(0xB0, 0xD8)):
    for trail in range(0xA1, 0xFF):
        try:
            common.update(map(ord, bytes((lead, trail)).decode('gb2312')))
        except UnicodeDecodeError:
            pass
for file in (ROOT / 'notes').rglob('*.md'):
    common.update(map(ord, file.read_text(encoding='utf-8')))
for file in (ROOT / 'scripts/layout.mjs', ROOT / 'site/app.js'):
    common.update(map(ord, file.read_text(encoding='utf-8')))
for file in (ROOT / 'dist').rglob('*.html'):
    parser = TextExtractor()
    parser.feed(file.read_text(encoding='utf-8'))
    common.update(map(ord, ''.join(parser.parts)))
all_chars = set(TTFont(SOURCE).getBestCmap())
DEST.mkdir(parents=True, exist_ok=True)
for label, chars, filename in (
    ('Common', common & all_chars, 'catobs-fandol-kai-common.woff2'),
    ('Extended', all_chars - common, 'catobs-fandol-kai-extended.woff2'),
):
    font = TTFont(SOURCE)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = '*'
    options.name_IDs = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=chars)
    sub.subset(font)
    for name in font['name'].names:
        if name.nameID in (1, 3, 4, 6, 16, 17):
            value = f'Catobs Fandol Kai {label}' if name.nameID != 6 else f'CatobsFandolKai{label}'
            name.string = value.encode(name.getEncoding(), errors='replace')
    font.flavor = 'woff2'
    target = DEST / filename
    font.save(target)
    print(f'{target.name}: {len(font.getBestCmap())} characters, {target.stat().st_size} bytes')
