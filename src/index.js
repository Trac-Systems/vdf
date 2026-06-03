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

function solve(module, fn, challenge, difficulty, discriminantSizeBits) {
  const [lo, hi] = splitU64(difficulty);
  return withBytes(module, challenge, (challengePtr, challengeLen) => {
    const code = fn(challengePtr, challengeLen, lo, hi, discriminantSizeBits);
    assertOk(module, code);
    return readLastResult(module);
  });
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
  const module = await createVdfWasmModule({ noInitialRun: true, ...options });
  return {
    module,
    solveWesolowski(challenge, difficulty, discriminantSizeBits) {
      return solve(module, module._vdf_solve_wesolowski, challenge, difficulty, discriminantSizeBits);
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

module.exports = { loadVdfWasm };
