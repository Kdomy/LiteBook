const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
function verify(source) {
  const begin = source.indexOf('// Feed identifier');
  const end = source.indexOf('(function() {', begin);
  const window = { location: { pathname: '/', hostname: 'm.facebook.com' }, isDesktopMode: () => false };
  const document = { querySelectorAll: () => [{ textContent: String.fromCodePoint(0xF1946) }] };
  vm.runInNewContext(source.slice(begin, end), { window, document });
  assert.equal(window.isFeed(), true, 'Mobile feed recognized with actual Facebook menu glyph');
  window.location.pathname = '/menu';
  assert.equal(window.isFeed(), false, 'Menu must not be treated as feed');
  assert.ok(source.includes("span.textContent === '\\u{F194A}'"), 'Search glyph is encoding-independent');
}
const file = 'app/src/main/res/raw/scripts.js';
assert.throws(() => verify(cp.execFileSync('git', ['show', 'HEAD:' + file], {encoding:'utf8'})));
verify(fs.readFileSync(file, 'utf8'));
console.log('PASS: feed detection regression reproduced and corrected; search glyph preserved.');
