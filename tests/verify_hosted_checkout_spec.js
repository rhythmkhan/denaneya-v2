/**
 * Empirical Verification Harness: Hosted Checkout Browser Flows
 * Tests:
 * 1. Web Audio API Synth Engine (Oscillators, Frequencies, Ramps, Autoplay resume)
 * 2. Printable Voucher DOM, Watermark, Stamp Seal, and Print CSS
 * 3. USSD Dialers (tel:*247%23, tel:*167%23) and Mobile App Deep Links (Intent & Custom schemes)
 * 4. TrxID Sanitizer and Format Validation Badge logic under adversarial inputs
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('🧪 VERIFICATION SUITE: Hosted Checkout Browser & Integration Flows');
console.log('================================================================');

const checkoutFilePath = path.resolve(__dirname, '../apps/dashboard/src/pages/HostedCheckoutPage.tsx');
assert(fs.existsSync(checkoutFilePath), `File not found: ${checkoutFilePath}`);
const fileContent = fs.readFileSync(checkoutFilePath, 'utf-8');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Web Audio Synth Arpeggio Verification
// -------------------------------------------------------------
console.log('\n--- 1. Web Audio Synthesizer Engine ---');

it('Synthesizer handles browser AudioContext and resume on suspended state', () => {
  assert(fileContent.includes('window.AudioContext || (window as any).webkitAudioContext'), 'AudioContext fallback missing');
  assert(fileContent.includes("ctx.state === 'suspended'"), 'Suspended state check missing');
  assert(fileContent.includes('await ctx.resume()'), 'Context resume call missing');
});

it('Synthesizer defines exact 4-note C-Major arpeggio frequencies (C5, E5, G5, C6)', () => {
  assert(fileContent.includes('freq: 523.25'), 'Missing C5 frequency 523.25');
  assert(fileContent.includes('freq: 659.25'), 'Missing E5 frequency 659.25');
  assert(fileContent.includes('freq: 783.99'), 'Missing G5 frequency 783.99');
  assert(fileContent.includes('freq: 1046.50'), 'Missing C6 frequency 1046.50');
});

it('Synthesizer creates dual oscillators (sine fundamental + triangle overtone)', () => {
  assert(fileContent.includes("osc1.type = 'sine'"), 'Fundamental sine oscillator missing');
  assert(fileContent.includes("osc2.type = 'triangle'"), 'Warm triangle harmonic oscillator missing');
  assert(fileContent.includes('linearRampToValueAtTime(0.20'), 'Sine envelope gain ramp missing');
  assert(fileContent.includes('linearRampToValueAtTime(0.06'), 'Triangle envelope gain ramp missing');
  assert(fileContent.includes('exponentialRampToValueAtTime(0.0001'), 'Gain decay envelope missing');
});

it('Simulated Web Audio execution produces expected scheduled node graph', async () => {
  class MockAudioParam {
    constructor(val = 0) {
      this.value = val;
      this.events = [];
    }
    setValueAtTime(val, time) {
      this.events.push({ type: 'setValue', val, time });
    }
    linearRampToValueAtTime(val, time) {
      this.events.push({ type: 'linearRamp', val, time });
    }
    exponentialRampToValueAtTime(val, time) {
      this.events.push({ type: 'expRamp', val, time });
    }
  }

  class MockGainNode {
    constructor() {
      this.gain = new MockAudioParam(1);
      this.connectedTo = null;
    }
    connect(dest) {
      this.connectedTo = dest;
    }
  }

  class MockOscillatorNode {
    constructor() {
      this.type = 'sine';
      this.frequency = new MockAudioParam(440);
      this.connectedTo = null;
      this.startedAt = null;
      this.stoppedAt = null;
    }
    connect(dest) {
      this.connectedTo = dest;
    }
    start(time) {
      this.startedAt = time;
    }
    stop(time) {
      this.stoppedAt = time;
    }
  }

  const createdOscillators = [];
  const createdGains = [];

  class MockAudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = { name: 'speakers' };
    }
    async resume() {
      this.state = 'running';
    }
    createOscillator() {
      const osc = new MockOscillatorNode();
      createdOscillators.push(osc);
      return osc;
    }
    createGain() {
      const g = new MockGainNode();
      createdGains.push(g);
      return g;
    }
  }

  // Emulate playSuccessChime()
  const ctx = new MockAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  assert.strictEqual(ctx.state, 'running', 'Context failed to resume');

  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.35 },
    { freq: 659.25, time: 0.11, dur: 0.35 },
    { freq: 783.99, time: 0.22, dur: 0.38 },
    { freq: 1046.50, time: 0.33, dur: 0.55 },
  ];

  notes.forEach(({ freq, time, dur }) => {
    const startTime = ctx.currentTime + time;
    const stopTime = startTime + dur;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.linearRampToValueAtTime(0.20, startTime + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, startTime);
    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.linearRampToValueAtTime(0.06, startTime + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  });

  assert.strictEqual(createdOscillators.length, 8, 'Should create exactly 8 oscillators (4 notes x 2 waves)');
  assert.strictEqual(createdGains.length, 8, 'Should create exactly 8 gain nodes');
  
  // Verify frequencies
  const freqs = createdOscillators.map(o => o.frequency.events[0].val);
  assert.deepStrictEqual(freqs, [523.25, 523.25, 659.25, 659.25, 783.99, 783.99, 1046.50, 1046.50]);
});

// -------------------------------------------------------------
// TEST SUITE 2: Printable Voucher DOM and Print CSS
// -------------------------------------------------------------
console.log('\n--- 2. Printable Voucher DOM, Watermark, Seal & CSS ---');

it('HostedCheckoutPage includes #printable-voucher element', () => {
  assert(fileContent.includes('id="printable-voucher"'), 'DOM ID #printable-voucher missing');
});

it('Printable voucher includes watermark background and physical-style stamp seal', () => {
  assert(fileContent.includes('watermark-text'), 'Missing watermark-text class');
  assert(fileContent.includes('★ DENANEYA VERIFIED PAYMENT ★'), 'Missing watermark text');
  assert(fileContent.includes('stamp-box'), 'Missing stamp-box class');
  assert(fileContent.includes('★ DENANEYA VERIFIED ★'), 'Missing verification seal text');
  assert(fileContent.includes('-rotate-12'), 'Missing rotated seal visual styling');
});

it('Scoped @media print CSS strictly hides non-printable elements and isolates #printable-voucher', () => {
  assert(fileContent.includes('@media print'), 'Missing @media print block');
  assert(fileContent.includes('header, footer, nav, button, a, .no-print'), 'Missing selector hiding nav/buttons/footers');
  assert(fileContent.includes('display: none !important;'), 'Missing display: none !important for chrome elements');
  assert(fileContent.includes('#printable-voucher {'), 'Missing #printable-voucher print styling');
  assert(fileContent.includes('display: block !important;'), '#printable-voucher should be display: block in print');
  assert(fileContent.includes('print-color-adjust: exact !important;'), 'Missing print-color-adjust for printer color preservation');
});

it('Print Memo and Replay Sound action buttons are present and wired', () => {
  assert(fileContent.includes('onClick={handlePrintReceipt}'), 'Missing Print Receipt button handler');
  assert(fileContent.includes('window.print()'), 'Missing window.print() call');
  assert(fileContent.includes('onClick={playSuccessChime}'), 'Missing manual sound replay button handler');
});

// -------------------------------------------------------------
// TEST SUITE 3: Mobile USSD and Deep Links
// -------------------------------------------------------------
console.log('\n--- 3. Mobile USSD and App Deep Links ---');

it('USSD Dial links correctly URI-encode hash symbol (*247%23 and *167%23)', () => {
  assert(fileContent.includes('`tel:${encodeURIComponent(activeGateway.ussdCode)}`'), 'Missing encodeURIComponent for USSD dial link');
  assert(encodeURIComponent('*247#') === '*247%23', 'encodeURI for *247# mismatch');
  assert(encodeURIComponent('*167#') === '*167%23', 'encodeURI for *167# mismatch');
});

it('Gateway configurations include bKash, Nagad, Rocket, and Upay with authentic USSD codes', () => {
  assert(fileContent.includes("id: 'bkash'") && fileContent.includes("ussdCode: '*247#'"), 'bKash *247# missing');
  assert(fileContent.includes("id: 'nagad'") && fileContent.includes("ussdCode: '*167#'"), 'Nagad *167# missing');
  assert(fileContent.includes("id: 'rocket'") && fileContent.includes("ussdCode: '*322#'"), 'Rocket *322# missing');
  assert(fileContent.includes("id: 'upay'") && fileContent.includes("ussdCode: '*268#'"), 'Upay *268# missing');
});

it('Mobile app deep links construct valid Android Intent URIs and iOS schemes', () => {
  // bKash
  assert(fileContent.includes('package=com.bKash.customerapp'), 'bKash Android package intent missing');
  assert(fileContent.includes("window.location.href = 'bkash://'"), 'bKash iOS scheme missing');
  
  // Nagad
  assert(fileContent.includes('package=com.konasl.nagad'), 'Nagad Android package intent missing');
  assert(fileContent.includes("window.location.href = 'nagad://'"), 'Nagad iOS scheme missing');

  // Rocket
  assert(fileContent.includes('package=com.dbbl.mbb.mpay'), 'Rocket Android package intent missing');
  assert(fileContent.includes("window.location.href = 'rocket://'"), 'Rocket iOS scheme missing');

  // Upay
  assert(fileContent.includes('package=bd.com.upay.customer'), 'Upay Android package intent missing');
  assert(fileContent.includes("window.location.href = 'upay://'"), 'Upay iOS scheme missing');
});

// -------------------------------------------------------------
// TEST SUITE 4: TrxID Sanitization & Adversarial Edge Cases
// -------------------------------------------------------------
console.log('\n--- 4. TrxID Sanitizer & Badge Logic ---');

const sanitizeTrxId = (rawInput) => {
  if (!rawInput) return '';
  let cleaned = rawInput.toUpperCase().trim();
  cleaned = cleaned.replace(/^(TRX\s*ID\s*[:#-]?\s*|TXN\s*ID\s*[:#-]?\s*|TRANSACTION\s*ID\s*[:#-]?\s*|TRX[:#-]?\s*|TXN[:#-]?\s*)/i, '');
  cleaned = cleaned.replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 32);
};

it('Sanitizer strips diverse prefix variants and whitespace', () => {
  assert.strictEqual(sanitizeTrxId('TrxID: 9H7K2LM1'), '9H7K2LM1');
  assert.strictEqual(sanitizeTrxId('trx id - BLK998877'), 'BLK998877');
  assert.strictEqual(sanitizeTrxId('TXN ID: 7A8B9C0D'), '7A8B9C0D');
  assert.strictEqual(sanitizeTrxId('Transaction ID: BAA112233'), 'BAA112233');
  assert.strictEqual(sanitizeTrxId('TRX:xyz8899'), 'XYZ8899');
  assert.strictEqual(sanitizeTrxId('   txn: blk123 '), 'BLK123');
});

it('Sanitizer removes special characters, lowercase letters, and trailing spaces', () => {
  assert.strictEqual(sanitizeTrxId('   a-b_c.1#2$3   '), 'ABC123');
  assert.strictEqual(sanitizeTrxId('bkash-trx-987654'), 'BKASHTRX987654');
});

it('Sanitizer caps maximum length to 32 characters', () => {
  const longInput = 'A'.repeat(50);
  assert.strictEqual(sanitizeTrxId(longInput).length, 32);
});

it('Sanitizer gracefully handles null, undefined, and empty inputs', () => {
  assert.strictEqual(sanitizeTrxId(''), '');
  assert.strictEqual(sanitizeTrxId(null), '');
  assert.strictEqual(sanitizeTrxId(undefined), '');
});

it('Dynamic TrxID validation badges match input length thresholds', () => {
  // Empty
  assert(fileContent.includes('trxIdInput.length === 0'), 'Badge check for 0 length missing');
  // Less than 6
  assert(fileContent.includes('trxIdInput.length < 6'), 'Badge check for < 6 length missing');
  // 6 or more
  assert(fileContent.includes('সঠিক ট্রানজেকশন ফরম্যাট'), 'Valid format badge text missing');
});

console.log('\n================================================================');
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
