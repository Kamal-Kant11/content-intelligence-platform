// A tiny stand-in for the LanguageTool /v2/check API, so tests run offline and give fixed results.
//   "teh"     -> misspelling, one suggestion ("the")      : applied by the optimizer
//   "We was"  -> grammar, one suggestion ("We were")      : applied by the optimizer
//   "recieve" -> misspelling, two suggestions             : ambiguous, left for the user
import http from 'node:http';

const RULES = [
  { re: /\bteh\b/g, issueType: 'misspelling', message: 'Possible spelling mistake found.', replacements: ['the'] },
  { re: /\bWe was\b/g, issueType: 'grammar', message: 'Use a plural verb with "we".', replacements: ['We were'] },
  { re: /\brecieve\b/g, issueType: 'misspelling', message: 'Possible spelling mistake found.', replacements: ['receive', 'relieve'] },
];

export function startFakeLanguageTool() {
  const server = http.createServer((req, res) => {
    if (req.url === '/v2/languages') return res.end('[]');
    if (req.method !== 'POST' || req.url !== '/v2/check') {
      res.statusCode = 404;
      return res.end();
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const text = new URLSearchParams(body).get('text') || '';
      const matches = RULES.flatMap((rule) =>
        [...text.matchAll(rule.re)].map((m) => ({
          message: rule.message,
          offset: m.index,
          length: m[0].length,
          replacements: rule.replacements.map((value) => ({ value })),
          rule: { id: `FAKE_${rule.issueType.toUpperCase()}`, issueType: rule.issueType, category: { name: rule.issueType } },
        }))
      );
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ matches }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
