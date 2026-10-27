const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const file = 'app/src/main/res/raw/scripts.js';
function verify(source) {
  const begin = source.includes('  const processedSources =') ? source.indexOf('  const processedSources =') : source.indexOf('  const processImage =');
  const end = source.indexOf('  // Facebook sometimes renders', begin);
  let queue = [], heals = 0;
  class Image { constructor() { this.src = 'https://cdn.test/photo'; this.currentSrc = ''; this.isConnected = true; this.complete = true; this.naturalWidth = 500; this.listeners = {}; } addEventListener(name, fn) { this.listeners[name] = fn; } }
  const context = { HTMLImageElement: Image, isViewerImage: () => true, heal: () => heals++, setTimeout: fn => queue.push(fn) };
  vm.createContext(context);
  vm.runInContext(source.slice(begin, end) + '\nglobalThis.process = processImage;', context);
  const image = new Image();
  context.process(image); image.listeners.load();
  for (let i = 0; i < 20; i++) context.process(image);
  while (queue.length) queue.shift()();
  assert.equal(heals, 1, 'One repair per image source despite scans and load callbacks');
  image.src = 'https://cdn.test/second';
  context.process(image);
  while (queue.length) queue.shift()();
  assert.equal(heals, 2, 'A changed source still gets repaired');
  const broken = new Image(); broken.naturalWidth = 0;
  context.process(broken);
  let attempts = 0;
  while (queue.length && attempts < 100) { queue.shift()(); attempts++; }
  assert.equal(queue.length, 0, 'Broken images must stop retrying');
}
const original = cp.execFileSync('git', ['show', 'HEAD:' + file], { encoding: 'utf8' });
assert.throws(() => verify(original), 'Regression reproduces on previous version');
verify(fs.readFileSync(file, 'utf8'));
console.log('PASS: previous bug reproduced; repeated scans, source changes and bounded retries verified.');
