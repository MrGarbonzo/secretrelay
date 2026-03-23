import { calculatePrice } from '../src/pricing.js';

let passed = 0;
let failed = 0;

function test(name, req, expected) {
  const result = calculatePrice(req);
  if (result === expected) {
    console.log(`  PASS: ${name} → ${result}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name} → got ${result}, expected ${expected}`);
    failed++;
  }
}

console.log('pricing tests\n');

// Small body (< 1kb), no attest
test('small body, no attest', {
  body: { message: 'hello' },
  query: {},
}, '$0.002');

// 15kb body, no attest → 1 surcharge unit (ceil((15360 - 1024) / 10240) = 2)
const bigBody = { data: 'x'.repeat(15000) };
test('15kb body, no attest', {
  body: bigBody,
  query: {},
}, '$0.004');

// Small body + attest=true
test('small body, attest=true', {
  body: { message: 'hello' },
  query: { attest: 'true' },
}, '$0.003');

// 15kb body + attest=true
test('15kb body, attest=true', {
  body: bigBody,
  query: { attest: 'true' },
}, '$0.005');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
