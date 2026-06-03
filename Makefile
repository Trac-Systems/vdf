# Copyright 2026 Trac Systems.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

WASM_TARGET := wasm32-unknown-emscripten
WASM_PROFILE := release
VDF_SRC_DIR := vdf-src
CARGO_TARGET_DIR := $(CURDIR)/target
WASM_JS := $(CARGO_TARGET_DIR)/$(WASM_TARGET)/$(WASM_PROFILE)/vdf-wasm.js
WASM_BINARY := $(CARGO_TARGET_DIR)/$(WASM_TARGET)/$(WASM_PROFILE)/vdf_wasm.wasm
DIST_WASM_DIR := dist/wasm
DIST_INTERNAL_DIR := $(DIST_WASM_DIR)/internal
DIST_JS := $(DIST_WASM_DIR)/vdf.js
DIST_MJS := $(DIST_WASM_DIR)/vdf.mjs
DIST_WASM_JS := $(DIST_INTERNAL_DIR)/vdf-wasm.js
DIST_WASM_BINARY := $(DIST_INTERNAL_DIR)/vdf_wasm.wasm
MP_VERSION := 6.3.0
MP_NAME := $(shell printf '\147\155\160')
MP_URL := https://ftpmirror.gnu.org/gnu/$(MP_NAME)/$(MP_NAME)-$(MP_VERSION).tar.xz
MP_SRC_ROOT := $(CARGO_TARGET_DIR)/wasm-mp-src
MP_TARBALL := $(MP_SRC_ROOT)/$(MP_NAME)-$(MP_VERSION).tar.xz
MP_SRC_DIR := $(MP_SRC_ROOT)/$(MP_NAME)-$(MP_VERSION)
MP_WASM_PREFIX := $(CURDIR)/target/wasm-mp-build
MP_WASM_LIB := $(MP_WASM_PREFIX)/lib/lib$(MP_NAME).a
CC_FOR_BUILD ?= cc
JOBS ?= $(shell sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
WASM_RUSTFLAGS := -L native=$(MP_WASM_PREFIX)/lib \
	-C link-arg=-sMODULARIZE=1 \
	-C link-arg=-sEXPORT_NAME=createVdfWasmModule \
	-C link-arg=-sENVIRONMENT=node \
	-C link-arg=-sALLOW_MEMORY_GROWTH=1 \
	-C link-arg=-sWASM_BIGINT \
	-C link-arg=-sEXPORTED_RUNTIME_METHODS=["HEAPU8"] \
	-C link-arg=-sEXPORTED_FUNCTIONS=["_main","_vdf_alloc","_vdf_dealloc","_vdf_last_result_ptr","_vdf_last_result_len","_vdf_last_error_ptr","_vdf_last_error_len","_vdf_solve_wesolowski","_vdf_verify_wesolowski"]

.PHONY: all wasm test bench wasm-lib clean

all: wasm

wasm: $(MP_WASM_LIB) src/index.js src/index.mjs
	rustup target add $(WASM_TARGET)
	CARGO_TARGET_DIR='$(CARGO_TARGET_DIR)' RUSTFLAGS='$(WASM_RUSTFLAGS)' cargo build --manifest-path $(VDF_SRC_DIR)/Cargo.toml -p vdf-wasm --target $(WASM_TARGET) --release
	mkdir -p $(DIST_INTERNAL_DIR)
	cp $(WASM_JS) $(DIST_WASM_JS)
	cp $(WASM_BINARY) $(DIST_WASM_BINARY)
	cp src/index.js $(DIST_JS)
	cp src/index.mjs $(DIST_MJS)

test: wasm
	node test/vdf.test.js
	node test/vdf-esm.test.mjs

bench: wasm
	node test/bench.js

$(MP_TARBALL):
	mkdir -p $(MP_SRC_ROOT)
	curl -L $(MP_URL) -o $(MP_TARBALL)

$(MP_SRC_DIR): $(MP_TARBALL)
	rm -rf $(MP_SRC_DIR)
	tar -xf $(MP_TARBALL) -C $(MP_SRC_ROOT)

$(MP_WASM_LIB): $(MP_SRC_DIR)
	cd $(MP_SRC_DIR) && CC_FOR_BUILD="$(CC_FOR_BUILD)" emconfigure ./configure --host=$(WASM_TARGET) --disable-assembly --disable-shared --enable-static --prefix="$(MP_WASM_PREFIX)" CFLAGS="-O3" ABI=standard
	cd $(MP_SRC_DIR) && emmake make -j$(JOBS)
	cd $(MP_SRC_DIR) && emmake make install

wasm-lib: $(MP_WASM_LIB)

clean:
	rm -rf ./dist ./target
