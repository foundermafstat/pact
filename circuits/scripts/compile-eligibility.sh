#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/eligibility-proof"
BUILD_DIR="$CIRCUIT_DIR/build"

if [[ -n "${CIRCOM_BIN:-}" ]]; then
  CIRCOM="$CIRCOM_BIN"
elif [[ -x "$HOME/.cargo/bin/circom" ]]; then
  CIRCOM="$HOME/.cargo/bin/circom"
else
  CIRCOM="$(command -v circom)"
fi

mkdir -p "$BUILD_DIR"
"$CIRCOM" "$CIRCUIT_DIR/eligibility-proof.circom" --r1cs --wasm --sym -o "$BUILD_DIR"
