import { parentPort, workerData } from 'node:worker_threads';
import { solveWesolowski } from '../../dist/wasm/vdf.mjs';

const state = new Int32Array(workerData);
const proof = await solveWesolowski(new Uint8Array([0xaa]), 513, 512, {
  onProgress(progress) {
    if (progress.phase !== 'squaring' || Atomics.load(state, 0) !== 0) return;
    parentPort.postMessage({ progress });
    // The parent must receive progress while this solve is still executing.
    Atomics.wait(state, 0, 0);
  },
});
parentPort.postMessage({ proof });
