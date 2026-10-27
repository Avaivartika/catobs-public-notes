"""Generate English listing metadata; never modify Markdown or article HTML.
Model: Helsinki-NLP/opus-mt-zh-en, University of Helsinki, CC-BY-4.0.
https://huggingface.co/Helsinki-NLP/opus-mt-zh-en
"""
import hashlib
import json
import os
from pathlib import Path
import re
import unicodedata
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'Helsinki-NLP/opus-mt-zh-en'
REVISION = 'cf109095479db38d6df799875e34039d4938aaa6'
VERSION = 'opus-zh-en-v3'
GLOSSARY = {'极客': 'Geek', '使用记录': 'Field notes', '研究': 'Research', '工具': 'Tools', '笔记': 'Notes'}

def source_hash(note):
    value = [VERSION, note['title'], note['description'], note['tags']]
    return hashlib.sha256(json.dumps(value, ensure_ascii=False).encode()).hexdigest()

def translate_index(data, previous, translate):
    cached = {n.get('sourcePath', n.get('title')): n for n in previous.get('notes', [])}
    for note in data['notes']:
        key = source_hash(note)
        old = cached.get(note.get('sourcePath'), cached.get(note['title'], {}))
        if old.get('translationHash') == key and all(isinstance(old.get(k), str) for k in ['titleEn', 'descriptionEn']) and isinstance(old.get('tagsEn'), list):
            for field in ['titleEn', 'descriptionEn', 'tagsEn']:
                note[field] = old[field]
        else:
            note['titleEn'] = translate(note['title'])
            note['descriptionEn'] = translate(note['description'])
            note['tagsEn'] = [translate(t) for t in note['tags']]
        note['translationHash'] = key
    used = set()
    for note in sorted(data['notes'], key=lambda n: n['sourcePath']):
        title = unicodedata.normalize('NFKD', note['titleEn']).encode('ascii', 'ignore').decode().lower()
        slug = re.sub(r'[^a-z0-9]+', '-', title).strip('-')[:80].rstrip('-')
        if not slug:
            raise ValueError(f"English title cannot form a URL: {note['titleEn']}")
        if slug in used:
            slug += '-' + hashlib.sha256(note['sourcePath'].encode()).hexdigest()[:8]
        used.add(slug)
        note['slug'] = slug
    data['translation'] = {'model': MODEL, 'revision': REVISION, 'license': 'CC-BY-4.0', 'version': VERSION}
    return data

def main():
    path = ROOT / '.cache/listing.json'
    data = json.loads(path.read_text())
    try:
        with urlopen('https://avaivartika.github.io/catobs-public-notes/index.json', timeout=20) as response:
            previous = json.load(response)
    except Exception:
        previous = {}
    engine = None
    memo = {}
    def translate(value):
        nonlocal engine
        if value in GLOSSARY:
            return GLOSSARY[value]
        if not re.search(r'[\u3400-\u9fff]', value):
            return value
        if value in memo:
            return memo[value]
        if engine is None:
            import torch
            from transformers import MarianMTModel, MarianTokenizer
            torch.set_num_threads(2)
            tokenizer = MarianTokenizer.from_pretrained(MODEL, revision=REVISION)
            model = MarianMTModel.from_pretrained(MODEL, revision=REVISION)
            model.eval()
            engine = (torch, tokenizer, model)
        torch, tokenizer, model = engine
        # Sentence-level generation prevents a long technical excerpt from losing its tail.
        chunks = [part for part in re.split(r'(?<=[。！？])\s*', value) if part.strip()]
        result = []
        for chunk in chunks:
            if not re.search(r'[\u3400-\u9fff]', chunk):
                result.append(chunk)
                continue
            urls = re.findall(r'https?://[^\s\u3000-\u303f\uff00-\uffef\u3400-\u9fff]+|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?|socks5h://', chunk)
            masked = chunk
            for i, url in enumerate(urls):
                masked = masked.replace(url, f'URL{i}', 1)
            inputs = tokenizer(masked, return_tensors='pt', truncation=False)
            if inputs['input_ids'].shape[1] > 480:
                raise ValueError('Listing text exceeds translation context')
            with torch.inference_mode():
                output = model.generate(**inputs, max_new_tokens=512, num_beams=4)
            translated = tokenizer.decode(output[0], skip_special_tokens=True).strip()
            if not translated:
                raise ValueError('Empty translation')
            for i, url in enumerate(urls):
                translated, replacements = re.subn(rf'URL\s*{i}\b', lambda _: url, translated, flags=re.I)
                if not replacements:
                    raise ValueError('Translation lost a URL placeholder')
            for brand in ['Codex', 'GLaDOS', 'Obsidian', 'GitHub', 'SSH', 'VPN']:
                if brand.lower() in chunk.lower():
                    translated = re.sub(rf'\b{brand}\b', brand, translated, flags=re.I)
            if '代理' in chunk:
                translated = re.sub(r'\bagents\b', 'proxies', translated, flags=re.I)
                translated = re.sub(r'\bagent\b', 'proxy', translated, flags=re.I)
            result.append(translated)
        memo[value] = ' '.join(result).strip()
        return memo[value]
    result = translate_index(data, previous, translate)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)
    print(f"Published bilingual metadata for {len(data['notes'])} notes; translated {len(memo)} text fragments")

if __name__ == '__main__':
    main()
