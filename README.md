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

## Benchmark

The root benchmark measures the packaged WASM Wesolowski interface. Build the
WASM artifacts first, then run the benchmark:

```sh
npm run build
npm run bench
```

`make bench` does both steps in one command:

```sh
make bench
```

The benchmark accepts these environment variables:

- `VDF_BITS`: discriminant size in bits. Default: `256`.
- `VDF_WESOLOWSKI_DIFFICULTY`: Wesolowski difficulty, i.e. the number of
  sequential squaring iterations. Default: `500`.
- `VDF_REPEATS`: number of solve/verify repetitions to average. Default: `5`.

Example:

```sh
VDF_BITS=2048 VDF_WESOLOWSKI_DIFFICULTY=500000 VDF_REPEATS=1 npm run bench
```

The output is a single summary line:

```text
wesolowski bits=2048 difficulty=500000 repeats=1 solve_ms=... verify_ms=... proof_bytes=...
```

Use low `VDF_REPEATS` values for high difficulties, because solve time scales
roughly linearly with `VDF_WESOLOWSKI_DIFFICULTY`.

Native Rust benchmarks from the underlying VDF implementation are also
available under `vdf-src`:

```sh
cargo bench --manifest-path vdf-src/Cargo.toml -p vdf
```

Those Criterion benchmarks cover lower-level native operations such as
classgroup operations and discriminant generation. They are useful for native
Rust profiling, while `npm run bench` / `make bench` measure the JavaScript
WASM package surface.

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
