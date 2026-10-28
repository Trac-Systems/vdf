import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import cjs from '../dist/wasm/vdf.js';
import * as esm from '../dist/wasm/vdf.mjs';

// SHA-256 of proofs produced by the published 0.0.2 package, before instrumentation.
const vectors = new Map([
  [40, '9e3dcc76de5110dd8f757bc658d88204fe8a735a61e50463bf540271a1ea9419'],
  [512, 'a4cdbf37da5bc39e0ad148408670ad0ca9c349faecec704804dbe9a47bd18db1'],
  [1024, '8ee3dd49019b6a75b834c81dacd2ac039afbecb4577d263518bbfad9c2afe2d7'],
  [2048, '8296bbf8dc736d0f784b18b71c42a1010b4728fd835df8daa7f89e5469b04e41'],
]);
const phases = ['discriminant-sieve', 'discriminant-candidates', 'squaring',
  'challenge-prime', 'proof-setup', 'proof-blocks', 'proof-aggregation', 'serialization'];

for (const [name, api] of [['CommonJS', cjs], ['ESM', esm]]) {
  for (const [bits, expectedHash] of vectors) {
    const events = [];
    let returned = false;
    const challenge = Buffer.from([0xaa]);
    const proof = await api.solveWesolowski(challenge, 513n, bits, {
      onProgress(progress) {
        assert.equal(returned, false, 'progress arrives during the solve');
        events.push(progress);
      },
    });
    returned = true;
    assert.equal(createHash('sha256').update(proof).digest('hex'), expectedHash);
    assert.deepEqual(proof, await api.solveWesolowski(challenge, 513n, bits));
    assert.ok(await api.verifyWesolowski(challenge, 513n, proof, bits));
    const counts = new Map();
    for (const { phase, completed } of events) {
      assert.ok(phases.includes(phase));
      assert.equal(typeof completed, 'bigint');
      assert.ok(completed > (counts.get(phase) ?? 0n), 'every report advances its phase');
      counts.set(phase, completed);
    }
    assert.deepEqual([...counts.keys()].sort(), [...phases].sort());
    assert.ok(counts.get('squaring') >= 513n);
    assert.equal(events.at(-1).phase, 'serialization');
    assert.ok(events.filter(event => event.phase === 'squaring').length > 1);
  }

  for (const options of [null, false, { onProgress: null }, { onProgress: 1 }]) {
    await assert.rejects(api.solveWesolowski(Buffer.from([1]), 10, 512, options), TypeError);
  }
  let invalidReports = 0;
  await assert.rejects(api.solveWesolowski(Buffer.from([1]), 10, -1, {
    onProgress() { invalidReports++; },
  }));
  assert.equal(invalidReports, 0, 'invalid solver parameters do not report completed work');
  const failure = new Error('observer failed');
  let calls = 0;
  await assert.rejects(api.solveWesolowski(Buffer.from([1]), 10, 512, {
    onProgress() { calls++; throw failure; },
  }), error => error === failure);
  assert.equal(calls, 1, 'an observer that throws is not called again');
  await api.solveWesolowski(Buffer.from([1]), 10, 512);
  assert.equal(calls, 1, 'the observer is removed after failure');

  const observations = [[], []];
  const proofs = await Promise.all(observations.map(events => api.solveWesolowski(Buffer.from([2]), 129, 512, {
    onProgress: event => events.push(event),
  })));
  assert.deepEqual(proofs[0], proofs[1]);
  assert.deepEqual(observations[0], observations[1], 'each solve owns its counters and observer');
  console.log(`${name}: progress, published proof vectors, observer cleanup and concurrent calls passed`);
}

const shared = new SharedArrayBuffer(4);
const state = new Int32Array(shared);
const worker = new Worker(new URL('./fixtures/progress-worker.mjs', import.meta.url), { workerData: shared });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not report live progress')), 10000);
    let observed = false;
    const finish = error => { clearTimeout(timer); error ? reject(error) : resolve(); };
    worker.on('error', finish);
    worker.on('exit', () => { if (!observed) finish(new Error('worker exited before reporting progress')); });
    worker.on('message', message => {
      try {
        if (message.progress) {
          assert.equal(message.progress.phase, 'squaring');
          observed = true;
          Atomics.store(state, 0, 1);
          Atomics.notify(state, 0);
        } else {
          assert.ok(observed, 'progress was delivered before the solve completed');
          assert.equal(createHash('sha256').update(message.proof).digest('hex'), vectors.get(512));
          finish();
        }
      } catch (error) { finish(error); }
    });
  });
  console.log('Worker: progress delivered before solve completion');
} finally {
  await worker.terminate();
}
