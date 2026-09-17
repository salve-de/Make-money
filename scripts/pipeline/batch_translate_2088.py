import json
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_FILE = 'data/translations_cache_2088.json'
INPUT_FILE = 'data/to_translate_2088.json'

def clean_input_text(text):
    if not text:
        return ''
    t = re.split(r'記事記載金額:|外部リンク候補:|利益、原価|公式URL:|記事更新日:', text)[0].strip()
    return t[:400]

def translate_text(text):
    cleaned = clean_input_text(text)
    if not cleaned:
        return ''
    url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q={urllib.parse.quote(cleaned)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=8) as res:
                data = json.loads(res.read().decode('utf-8'))
                ja = ''.join([p[0] for p in data[0] if p and p[0]])
                return ja.strip()
        except Exception as e:
            time.sleep(0.5 * (attempt + 1))
    return ''

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found")
        return

    with open(INPUT_FILE, 'r') as f:
        items = json.load(f)

    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} existing translations from cache.")
        except Exception:
            cache = {}

    to_do = [item for item in items if item['id'] not in cache or not cache[item['id']]]
    print(f"Total items: {len(items)}, Remaining to translate: {len(to_do)}")

    if not to_do:
        print("All items are already translated!")
        return

    completed_count = 0
    save_interval = 50
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_item = {executor.submit(translate_text, item['text']): item for item in to_do}
        for future in as_completed(future_to_item):
            item = future_to_item[future]
            eid = item['id']
            try:
                res = future.result()
                if res:
                    cache[eid] = {
                        'id': eid,
                        'name': item['name'],
                        'source': item.get('source', ''),
                        'en_text': clean_input_text(item.get('text', '')),
                        'ja_text': res,
                        'role': item.get('role', ''),
                        'url': item.get('url', ''),
                        'tags': item.get('tags', [])
                    }
            except Exception as e:
                print(f"Error translating {eid}: {e}")

            completed_count += 1
            if completed_count % save_interval == 0 or completed_count == len(to_do):
                elapsed = time.time() - start_time
                rate = completed_count / elapsed if elapsed > 0 else 0
                eta = (len(to_do) - completed_count) / rate if rate > 0 else 0
                print(f"[{completed_count}/{len(to_do)}] ({completed_count/len(to_do)*100:.1f}%) Saved cache. Speed: {rate:.1f} items/s. ETA: {eta:.1f}s")
                with open(CACHE_FILE, 'w') as f:
                    json.dump(cache, f, indent=2, ensure_ascii=False)

    print("Translation phase completed!")

if __name__ == '__main__':
    main()
