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

const { solveWesolowski, verifyWesolowski } = require('../dist/wasm/vdf.js');
const b4a = require('b4a');

async function timeMs(fn, repeats) {
  const start = process.hrtime.bigint();
  let value;
  for (let i = 0; i < repeats; i += 1) {
    value = await fn();
  }
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  return [elapsed / repeats, value];
}

async function main() {
  const challenge = b4a.from([0xaa]);
  const bits = Number(process.env.VDF_BITS || 256);
  const difficulty = BigInt(process.env.VDF_WESOLOWSKI_DIFFICULTY || 500);
  const repeats = Number(process.env.VDF_REPEATS || 5);

  const [solveMs, proof] = await timeMs(
    () => solveWesolowski(challenge, difficulty, bits),
    repeats,
  );
  const [verifyMs] = await timeMs(async () => {
    if (!(await verifyWesolowski(challenge, difficulty, proof, bits))) {
      throw new Error('Wesolowski proof did not verify');
    }
  }, repeats);

  console.log(
    `wesolowski bits=${bits} difficulty=${difficulty} repeats=${repeats} solve_ms=${solveMs.toFixed(
      3,
    )} verify_ms=${verifyMs.toFixed(3)} proof_bytes=${proof.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
