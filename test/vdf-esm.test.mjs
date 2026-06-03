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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import b4a from 'b4a';
import { loadVdfWasm } from '../dist/wasm/vdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.resolve(__dirname, '../dist/wasm/vdf.mjs');

if (!fs.existsSync(artifactPath)) {
  throw new Error('VDF WASM ESM artifact not found. Please run `npm run build` before running tests.');
}

const vdf = await loadVdfWasm();
const challenge = b4a.from([0xaa]);
const difficulty = 500n;
const proof = vdf.solveWesolowski(challenge, difficulty, 40);

if (!vdf.verifyWesolowski(challenge, difficulty, proof, 40)) {
  throw new Error('Wesolowski ESM proof did not verify');
}

console.log('wasm esm wesolowski ok', {
  proofBytes: proof.length,
  proofHex: b4a.toString(proof, 'hex'),
});
