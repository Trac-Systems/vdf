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

const fs = require('fs');
const Module = require('module');
const path = require('path');
const { pathToFileURL } = require('url');
const b4a = require('b4a');

const cjsSourcePath = path.resolve(__dirname, '../src/index.js');
const esmSourcePath = path.resolve(__dirname, '../src/index.mjs');

function createFakeWasmModule() {
  const resultPtr = 128;
  const resultLen = 8;
  const heap = new Uint8Array(256);
  let nextPtr = 16;

  return {
    resultLen,
    resultPtr,
    module: {
      HEAPU8: heap,
      _vdf_alloc(len) {
        const ptr = nextPtr;
        nextPtr += Math.max(len, 1);
        return ptr;
      },
      _vdf_dealloc() {},
      _vdf_last_result_ptr() {
        return resultPtr;
      },
      _vdf_last_result_len() {
        return resultLen;
      },
      _vdf_last_error_ptr() {
        return 0;
      },
      _vdf_last_error_len() {
        return 0;
      },
      _vdf_solve_wesolowski(challengePtr, challengeLen) {
        const seed = challengeLen === 0 ? 0 : heap[challengePtr];
        for (let i = 0; i < resultLen; i += 1) {
          heap[resultPtr + i] = (seed + i) & 0xff;
        }
        return 0;
      },
      _vdf_verify_wesolowski() {
        return 1;
      },
    },
  };
}

function loadCjsWithFakeWasm(fakeModule) {
  const originalLoad = Module._load;
  delete require.cache[cjsSourcePath];

  Module._load = function load(request, parent, isMain) {
    if (parent && parent.filename === cjsSourcePath && request === './internal/vdf-wasm.js') {
      return async function createVdfWasmModule() {
        return fakeModule;
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(cjsSourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

async function loadEsmWithFakeWasm(fakeModule) {
  const tmpDir = fs.mkdtempSync(path.resolve(__dirname, '../node_modules/.trac-vdf-memory-copy-'));
  const internalDir = path.join(tmpDir, 'internal');
  fs.mkdirSync(internalDir);
  fs.copyFileSync(esmSourcePath, path.join(tmpDir, 'index.mjs'));
  fs.writeFileSync(
    path.join(internalDir, 'vdf-wasm.js'),
    [
      'module.exports = async function createVdfWasmModule() {',
      '  return globalThis.__tracVdfMemoryCopyFakeModule;',
      '};',
      '',
    ].join('\n'),
  );

  globalThis.__tracVdfMemoryCopyFakeModule = fakeModule;
  try {
    const api = await import(pathToFileURL(path.join(tmpDir, 'index.mjs')).href);
    return {
      api,
      cleanup() {
        delete globalThis.__tracVdfMemoryCopyFakeModule;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
  } catch (err) {
    delete globalThis.__tracVdfMemoryCopyFakeModule;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

async function assertReturnedBytesAreDetached(label, api, fake) {
  const proof = await api.solveWesolowski(b4a.from([0x42]), 1n, 40);
  const snapshot = b4a.from(proof);

  fake.module.HEAPU8.fill(0xee, fake.resultPtr, fake.resultPtr + fake.resultLen);

  if (!b4a.equals(proof, snapshot)) {
    throw new Error(`${label} returned a view into WASM memory instead of a copy`);
  }
}

async function main() {
  const cjsFake = createFakeWasmModule();
  await assertReturnedBytesAreDetached('CommonJS', loadCjsWithFakeWasm(cjsFake.module), cjsFake);

  const esmFake = createFakeWasmModule();
  const esm = await loadEsmWithFakeWasm(esmFake.module);
  try {
    await assertReturnedBytesAreDetached('ESM', esm.api, esmFake);
  } finally {
    esm.cleanup();
  }

  console.log('wasm memory-copy regression ok');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
