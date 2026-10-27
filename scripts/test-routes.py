import importlib.util
import unittest
spec = importlib.util.spec_from_file_location('translate', 'scripts/translate-index.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Routes(unittest.TestCase):
    def note(self, source, title):
        return dict(sourcePath=source, title=title, description='简介', tags=['笔记'])

    def test_english_routes_and_collision(self):
        data = {'notes': [self.note('甲.md', '甲'), self.note('乙.md', '乙')]}
        result = module.translate_index(data, {}, lambda text: 'Same English Title!')
        slugs = [n['slug'] for n in result['notes']]
        self.assertEqual(len(set(slugs)), 2)
        for slug in slugs:
            self.assertRegex(slug, r'^same-english-title(?:-[a-f0-9]{8})?$')

    def test_cached_translation_uses_source_not_url(self):
        data = {'notes': [self.note('甲.md', '甲')]}
        previous = module.translate_index(data, {}, lambda text: 'English Title')
        previous['notes'][0]['href'] = 'https://example.com/n/english-title/'
        result = module.translate_index({'notes': [self.note('甲.md', '甲')]}, previous,
                                       lambda _: self.fail('Unchanged source should reuse translation'))
        self.assertEqual(result['notes'][0]['slug'], 'english-title')

    def test_empty_ascii_title_fails(self):
        with self.assertRaises(ValueError):
            module.translate_index({'notes': [self.note('甲.md', '甲')]}, {}, lambda text: '中文')

if __name__ == '__main__':
    unittest.main()
