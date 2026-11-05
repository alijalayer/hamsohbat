// Generates a calm ambient score (pads + soft piano-like arpeggio) as music.wav.
const fs = require('fs');
const path = require('path');

const SR = 44100, DUR = 32, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// Am – F – C – G, twice; MIDI notes per chord.
const CHORDS = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
const BAR = 4;

function add(buf, i, v) { if (i >= 0 && i < N) buf[i] += v; }

// Pads: soft additive tones with slow attack and long release.
for (let b = 0; b < DUR / BAR; b++) {
  const chord = CHORDS[b % 4], t0 = b * BAR;
  chord.forEach((m, k) => {
    const f = hz(m), start = Math.floor(t0 * SR), len = Math.floor((BAR + 2) * SR);
    const pan = 0.3 + 0.4 * (k / 3);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 1.6) * (t > BAR ? Math.max(0, 1 - (t - BAR) / 2) : 1);
      const v = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * t) + 0.15 * Math.sin(2 * Math.PI * f * 3.01 * t)) * env * 0.045;
      add(L, start + i, v * (1 - pan)); add(R, start + i, v * pan);
    }
  });
  // Low root for warmth.
  const f = hz(chord[0] - 12), start = Math.floor(t0 * SR);
  for (let i = 0; i < (BAR + 1.5) * SR; i++) {
    const t = i / SR, env = Math.min(1, t / 1.2) * (t > BAR ? Math.max(0, 1 - (t - BAR) / 1.5) : 1);
    const v = Math.sin(2 * Math.PI * f * t) * env * 0.07;
    add(L, start + i, v); add(R, start + i, v);
  }
}

// Arpeggio from 9s (when the app appears) to 28s.
const STEP = 0.5;
for (let t0 = 9; t0 < 28; t0 += STEP) {
  const chord = CHORDS[Math.floor(t0 / BAR) % 4], k = Math.round((t0 - 9) / STEP);
  const m = chord[[0, 2, 1, 3, 2, 1][k % 6]] + 12, f = hz(m);
  const start = Math.floor(t0 * SR), pan = 0.5 + 0.3 * Math.sin(k);
  for (let i = 0; i < 1.8 * SR; i++) {
    const t = i / SR, env = Math.exp(-t * 3.2) * Math.min(1, t / 0.005);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 6)) * env * 0.06;
    add(L, start + i, v * (1 - pan)); add(R, start + i, v * pan);
  }
}

// Soft low swells on scene changes.
[0.2, 9, 27].forEach(t0 => {
  const start = Math.floor(t0 * SR);
  for (let i = 0; i < 3 * SR; i++) {
    const t = i / SR, v = Math.sin(2 * Math.PI * 49 * t) * Math.exp(-t * 1.3) * Math.min(1, t / 0.05) * 0.18;
    add(L, start + i, v); add(R, start + i, v);
  }
});

// Ping-pong delay as a light reverb.
const dl = Math.floor(0.33 * SR), dr = Math.floor(0.41 * SR);
for (let i = 0; i < N; i++) {
  if (i >= dl) L[i] += R[i - dl] * 0.32;
  if (i >= dr) R[i] += L[i - dr] * 0.32;
}

// Fade in/out and normalise to -3 dB.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, g = Math.min(1, t / 1.5, (DUR - t) / 2.2);
  L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.707 / peak;

const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(__dirname, 'music.wav'), buf);
console.log('music.wav written');
