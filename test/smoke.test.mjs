// Smoke test: runs a built wallpaper's inlined bundle under DOM/canvas stubs
// for several frames and asserts the render pipeline executes (cells filled,
// leading stroked) without throwing.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'stained-glass';
const html = readFileSync(join(ROOT, 'build', mode, 'index.html'), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

let fills = 0, strokes = 0, frames = 0;
const ctxStub = new Proxy({}, {
  get(_, prop) {
    if (prop === 'fill') return () => { fills++; };
    if (prop === 'stroke') return () => { strokes++; };
    return () => {};
  },
  set() { return true; }
});
const canvasStub = { width: 1920, height: 1080, style: {}, parentNode: null, getContext: () => ctxStub, remove() {} };
const rafQueue = [];
const sandbox = {
  document: { createElement: () => canvasStub, querySelector: () => ({ appendChild() {} }), body: { appendChild() {} } },
  requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  Math, Map, Set, Object, Array, console, Date
};
sandbox.window = sandbox;
sandbox.window.innerWidth = 1920;
sandbox.window.innerHeight = 1080;
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};

vm.createContext(sandbox);
vm.runInContext(js, sandbox);

let t = 0;
while (rafQueue.length && frames < 10) { const cb = rafQueue.shift(); frames++; cb(t += 16.7); }

console.log(`[${mode}] frames=${frames} fills=${fills} strokes=${strokes}`);
const ok = frames >= 10 && fills > 100 && strokes > 0;
console.log(ok ? 'SMOKE TEST PASS' : 'SMOKE TEST FAIL');
process.exit(ok ? 0 : 1);
