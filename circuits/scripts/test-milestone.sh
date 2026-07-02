#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/milestone-unlock-proof"
BUILD_DIR="$CIRCUIT_DIR/build"
WITNESS_JS="$BUILD_DIR/milestone-unlock-proof_js/generate_witness.js"
WASM="$BUILD_DIR/milestone-unlock-proof_js/milestone-unlock-proof.wasm"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

bash "$ROOT_DIR/circuits/scripts/compile-milestone.sh" >/dev/null

expect_success() {
  local fixture="$1"
  node "$WITNESS_JS" "$WASM" "$fixture" "$TMP_DIR/witness.wtns" >/dev/null
}

expect_failure() {
  local fixture="$1"
  if node "$WITNESS_JS" "$WASM" "$fixture" "$TMP_DIR/witness.wtns" >/dev/null 2>&1; then
    echo "Expected witness generation to fail for $fixture" >&2
    exit 1
  fi
}

expect_success "$CIRCUIT_DIR/fixtures/valid.json"
expect_failure "$CIRCUIT_DIR/fixtures/below-active-users.json"
expect_failure "$CIRCUIT_DIR/fixtures/below-pilot-partners.json"
expect_failure "$CIRCUIT_DIR/fixtures/audit-false.json"
expect_failure "$CIRCUIT_DIR/fixtures/wrong-recipient.json"
expect_failure "$CIRCUIT_DIR/fixtures/wrong-amount.json"
expect_failure "$CIRCUIT_DIR/fixtures/wrong-milestone.json"
