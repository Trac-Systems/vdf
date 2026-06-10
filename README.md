# trac-vdf

WASM and JavaScript packaging for the Trac VDF implementation.

## Build

```sh
npm run build
```

Generated package artifacts are written to `dist/wasm`.

## Usage

```js
const { solveWesolowski, verifyWesolowski } = require('@tracsystems/trac-vdf');

const proof = await solveWesolowski(challenge, difficulty, discriminantSizeBits);
const ok = await verifyWesolowski(challenge, difficulty, proof, discriminantSizeBits);
```

## Test

```sh
npm run test
```

The test suite checks both CommonJS and ESM entrypoints.

## License and attribution

This project is licensed under the Apache License 2.0.

The VDF implementation used by this project is derived from
`Trac-Systems/vdf-FORK` at commit
`2731d2e2850797d752d70f49e4c263a9bf3b0c82`, with upstream provenance
including `poanetwork/vdf` and Chia Network's VDF reference /
competition implementation.

Chia Network attribution is reproduced in `NOTICE`.
Additional third-party notices are in `THIRD_PARTY_NOTICES.md`.

No endorsement by Chia Network, POA Network, or any upstream project is
implied.
