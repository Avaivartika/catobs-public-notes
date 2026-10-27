import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const handlers = {}, entries = new Map();
let requests = 0;
const cache = {
  match: async req => entries.get(typeof req === 'string' ? req : req.url),
  put: async (req, response) => entries.set(req.url, response),
  keys: async () => [...entries.keys()].map(url => new Request(url)),
  delete: async req => entries.delete(req.url)
};
vm.runInNewContext(fs.readFileSync('site/font-cache.js', 'utf8'), {
  URL, Request,
  self: { location: {origin:'https://example.com'}, registration: {scope:'https://example.com/catobs-public-notes/'}, addEventListener: (name, fn) => handlers[name] = fn },
  caches: {open: async () => cache},
  fetch: async () => { requests++; return new Response('font'); }
});
const request = new Request('https://example.com/catobs-public-notes/webfonts/kai-1234567890abcdef.woff2');
for (let i = 0; i < 2; i++) {
  let result;
  handlers.fetch({request, respondWith: p => result = p});
  assert.equal((await result).status, 200);
}
assert.equal(requests, 1, 'Repeat font access must use cache');
handlers.fetch({request:new Request('https://example.com/catobs-public-notes/'), respondWith: () => assert.fail('HTML must never use font cache')});
console.log('Font cache reuses downloads and leaves HTML on the network.');
