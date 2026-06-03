# Third-Party Notices

This repository contains or builds upon third-party open-source software.

## Chia Network VDF implementation

Portions of this project are derived from Chia Network's VDF reference /
competition implementation.

Upstream notice:

```text
Chia vdf-toy
Copyright 2018 and onwards Chia Network Inc.

This product includes software developed at
Chia Network Inc (https://www.chia.net/).
```

License: Apache License 2.0.

## poanetwork/vdf

Portions of the VDF Rust implementation are derived from poanetwork/vdf,
which was published under the Apache License 2.0.

## Trac-Systems/vdf-FORK

This project uses or derives from Trac-Systems/vdf-FORK at commit:

```text
2731d2e2850797d752d70f49e4c263a9bf3b0c82
```

License: Apache License 2.0.

## rust-gmp

The upstream VDF code includes code from rust-gmp.

```text
Copyright (c) 2014 Daniel Micay

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

License: MIT.

## GMP

The build downloads GNU MP 6.3.0 and links it into the generated WASM
artifact.

Project: https://gmplib.org/

License: GNU LGPLv3 or GNU GPLv2.

Before publishing compiled WASM artifacts, verify and satisfy the license
obligations that apply to distributing GMP-linked object code.
