// Copyright 2026 Trac Systems.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const createVdfWasmModule = require('./internal/vdf-wasm.js');
const b4a = require('b4a');

let vdfWasm;

function ensureCrypto() {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    return;
  }

  const runtimeCrypto = require('crypto');
  const webCrypto =
    runtimeCrypto.webcrypto ||
    (runtimeCrypto.default && runtimeCrypto.default.webcrypto) ||
    runtimeCrypto.default ||
    runtimeCrypto;
  const randomFillSync =
    runtimeCrypto.randomFillSync ||
    (runtimeCrypto.default && runtimeCrypto.default.randomFillSync);

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    globalThis.crypto = webCrypto;
  } else if (typeof randomFillSync === 'function') {
    globalThis.crypto = {
      getRandomValues(view) {
        randomFillSync(view);
        return view;
      },
    };
  }
}

function splitU64(value) {
  const n = BigInt(value);
  return [Number(n & 0xffffffffn), Number(n >> 32n)];
}

function readBytes(module, ptr, len) {
  return b4a.from(module.HEAPU8.slice(ptr, ptr + len));
}

function readLastResult(module) {
  return readBytes(module, module._vdf_last_result_ptr(), module._vdf_last_result_len());
}

function readLastError(module) {
  return b4a.toString(
    readBytes(module, module._vdf_last_error_ptr(), module._vdf_last_error_len()),
    'utf8',
  );
}

function withBytes(module, bytes, fn) {
  const buffer = b4a.from(bytes);
  const ptr = module._vdf_alloc(buffer.length);
  module.HEAPU8.set(buffer, ptr);
  try {
    return fn(ptr, buffer.length);
  } finally {
    module._vdf_dealloc(ptr, buffer.length);
  }
}

function assertOk(module, code) {
  if (code < 0) {
    throw new Error(readLastError(module) || `VDF call failed with code ${code}`);
  }
}

const SOLVE_PHASES = [
  null, 'discriminant-sieve', 'discriminant-candidates', 'squaring',
  'challenge-prime', 'proof-setup', 'proof-blocks', 'proof-aggregation', 'serialization',
];

function solve(module, fn, challenge, difficulty, discriminantSizeBits, options = {}) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('solve options must be an object');
  }
  const { onProgress } = options;
  if (onProgress !== undefined && typeof onProgress !== 'function') {
    throw new TypeError('onProgress must be a function');
  }
  let observerFailed = false;
  let observerError;
  if (onProgress) {
    module.onVdfProgress = (phase, lo, hi) => {
      if (observerFailed) return;
      try {
        onProgress({
          phase: SOLVE_PHASES[phase],
          completed: (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0),
        });
      } catch (error) {
        // Do not unwind a JS exception through Rust frames: let Rust release its
        // allocations, then reject the solve and remove the observer.
        observerFailed = true;
        observerError = error;
      }
    };
    fn = module._vdf_solve_wesolowski_with_progress;
  }
  try {
    const [lo, hi] = splitU64(difficulty);
    const proof = withBytes(module, challenge, (challengePtr, challengeLen) => {
      const code = fn(challengePtr, challengeLen, lo, hi, discriminantSizeBits);
      assertOk(module, code);
      return readLastResult(module);
    });
    if (observerFailed) throw observerError;
    return proof;
  } finally {
    module.onVdfProgress = undefined;
  }
}

function verify(module, fn, challenge, difficulty, proof, discriminantSizeBits) {
  const [lo, hi] = splitU64(difficulty);
  return withBytes(module, challenge, (challengePtr, challengeLen) =>
    withBytes(module, proof, (proofPtr, proofLen) => {
      const code = fn(challengePtr, challengeLen, lo, hi, proofPtr, proofLen, discriminantSizeBits);
      assertOk(module, code);
      return code === 1;
    }),
  );
}

async function loadVdfWasm(options = {}) {
  ensureCrypto();
  const module = await createVdfWasmModule({ noInitialRun: true, ...options });
  return {
    module,
    solveWesolowski(challenge, difficulty, discriminantSizeBits, options) {
      return solve(module, module._vdf_solve_wesolowski, challenge, difficulty, discriminantSizeBits, options);
    },
    verifyWesolowski(challenge, difficulty, proof, discriminantSizeBits) {
      return verify(
        module,
        module._vdf_verify_wesolowski,
        challenge,
        difficulty,
        proof,
        discriminantSizeBits,
      );
    },
  };
}

async function getVdfWasm() {
  if (!vdfWasm) {
    vdfWasm = loadVdfWasm();
  }
  return vdfWasm;
}

async function solveWesolowski(challenge, difficulty, discriminantSizeBits, options) {
  const vdf = await getVdfWasm();
  return vdf.solveWesolowski(challenge, difficulty, discriminantSizeBits, options);
}

async function verifyWesolowski(challenge, difficulty, proof, discriminantSizeBits) {
  const vdf = await getVdfWasm();
  return vdf.verifyWesolowski(challenge, difficulty, proof, discriminantSizeBits);
}

module.exports.solveWesolowski = solveWesolowski;
module.exports.verifyWesolowski = verifyWesolowski;
