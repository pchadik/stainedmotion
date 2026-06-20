// Verifies the three-axis motion system: bounded, time-varying, desynchronized,
// never fully still, and suppressible via the intensity / enable hooks.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(join(ROOT, 'src/core/motion.js'), 'utf8');
const sandbox = { window: {}, Math, Object };
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const createMotion = sandbox.window.App.createMotion;

let pass = true;
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name); if (!ok) pass = false; };
const range = (a) => Math.max(...a) - Math.min(...a);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// Default motion across ~10 minutes at 1s steps.
const m = createMotion();
const us = [], rs = [], ps = [], energies = [], spreads = [];
let inBounds = true;
for (let i = 0; i < 600; i++) {
  const v = m.sample(i * 1000);
  for (const k of ['u', 'r', 'p']) if (v[k] < 0 || v[k] > 1) inBounds = false;
  us.push(v.u); rs.push(v.r); ps.push(v.p);
  energies.push(v.u + v.r + v.p);
  spreads.push(Math.max(v.u, v.r, v.p) - Math.min(v.u, v.r, v.p));
}
check('all values within [0,1]', inBounds);
check('axis u varies (range > 0.5)', range(us) > 0.5);
check('axis r varies (range > 0.5)', range(rs) > 0.5);
check('axis p varies (range > 0.5)', range(ps) > 0.5);
check('axes desynchronized (mean spread > 0.1)', mean(spreads) > 0.1);
check('energy floor holds (min combined >= 0.6)', Math.min(...energies) >= 0.6 - 1e-9);

// Master intensity 0 suppresses everything.
const off = createMotion({ intensity: 0 });
let allZero = true;
for (let i = 0; i < 100; i++) { const v = off.sample(i * 1000); if (v.u || v.r || v.p) allZero = false; }
check('intensity 0 => all axes zero', allZero);

// Disabling one axis zeros it while others still move.
const noP = createMotion({ enabled: { p: false } });
let pZero = true; const rMoves = [];
for (let i = 0; i < 200; i++) { const v = noP.sample(i * 1000); if (v.p !== 0) pZero = false; rMoves.push(v.r); }
check('disabled axis p stays 0', pZero);
check('other axes still vary when one disabled', range(rMoves) > 0.5);

console.log(pass ? '\nMOTION TEST PASS' : '\nMOTION TEST FAIL');
process.exit(pass ? 0 : 1);
