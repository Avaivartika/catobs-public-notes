"""Generate English listing metadata; never modify Markdown or article HTML.
Model: Helsinki-NLP/opus-mt-zh-en, University of Helsinki, CC-BY-4.0.
https://huggingface.co/Helsinki-NLP/opus-mt-zh-en
"""
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'Helsinki-NLP/opus-mt-zh-en'
REVISION = 'cf109095479db38d6df799875e34039d4938aaa6'
VERSION = 'opus-zh-en-v1'

def source_hash(note):
    value = [VERSION, note['title'], note['description'], note['tags']]
    return hashlib.sha256(json.dumps(value, ensure_ascii=False).encode()).hexdigest()

def translate_index(data, previous, translate):
    cached = {n['href']: n for n in previous.get('notes', [])}
    for note in data['notes']:
        key = source_hash(note)
        old = cached.get(note['href'], {})
        if old.get('translationHash') == key and all(isinstance(old.get(k), str) and old[k] for k in ['titleEn', 'descriptionEn']) and isinstance(old.get('tagsEn'), list):
            for field in ['titleEn', 'descriptionEn', 'tagsEn']:
                note[field] = old[field]
        else:
            note['titleEn'] = translate(note['title'])
            note['descriptionEn'] = translate(note['description'])
            note['tagsEn'] = [translate(t) for t in note['tags']]
        note['translationHash'] = key
    data['translation'] = {'model': MODEL, 'revision': REVISION, 'license': 'CC-BY-4.0', 'version': VERSION}
    return data

def main():
    path = ROOT / 'dist/index.json'
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
        # Keep URLs literal; the model should translate prose, not rewrite destinations.
        chunks = re.split(r'(https?://[^\s\u3000-\u303f\uff00-\uffef\u3400-\u9fff]+)', value)
        result = []
        for chunk in chunks:
            if not chunk or chunk.startswith(('http://', 'https://')) or not re.search(r'[\u3400-\u9fff]', chunk):
                result.append(chunk)
                continue
            inputs = tokenizer(chunk, return_tensors='pt', truncation=False)
            if inputs['input_ids'].shape[1] > 480:
                raise ValueError('Listing text exceeds translation context')
            with torch.inference_mode():
                output = model.generate(**inputs, max_new_tokens=512, num_beams=4)
            translated = tokenizer.decode(output[0], skip_special_tokens=True).strip()
            if not translated:
                raise ValueError('Empty translation')
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
