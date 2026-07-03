#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CIRCUIT="${1:-}"
COMMAND="${2:-all}"

case "$CIRCUIT" in
  eligibility)
    CIRCUIT_DIR="$ROOT_DIR/circuits/eligibility-proof"
    CIRCUIT_FILE="$CIRCUIT_DIR/eligibility-proof.circom"
    CIRCUIT_NAME="eligibility-proof"
    FIXTURE="${3:-$CIRCUIT_DIR/fixtures/valid.json}"
    COMPILE_SCRIPT="$ROOT_DIR/circuits/scripts/compile-eligibility.sh"
    ;;
  milestone)
    CIRCUIT_DIR="$ROOT_DIR/circuits/milestone-unlock-proof"
    CIRCUIT_FILE="$CIRCUIT_DIR/milestone-unlock-proof.circom"
    CIRCUIT_NAME="milestone-unlock-proof"
    FIXTURE="${3:-$CIRCUIT_DIR/fixtures/valid.json}"
    COMPILE_SCRIPT="$ROOT_DIR/circuits/scripts/compile-milestone.sh"
    ;;
  payment-revenue)
    CIRCUIT_DIR="$ROOT_DIR/circuits/payment-revenue-threshold-proof"
    CIRCUIT_FILE="$CIRCUIT_DIR/payment-revenue-threshold-proof.circom"
    CIRCUIT_NAME="payment-revenue-threshold-proof"
    FIXTURE="${3:-$CIRCUIT_DIR/fixtures/valid.json}"
    COMPILE_SCRIPT="$ROOT_DIR/circuits/scripts/compile-payment-revenue.sh"
    ;;
  *)
    echo "Usage: $0 eligibility|milestone|payment-revenue compile|witness|setup|prove|verify|all [fixture.json]" >&2
    exit 1
    ;;
esac

BUILD_DIR="$CIRCUIT_DIR/build"
WASM="$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
WITNESS_JS="$BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js"
R1CS="$BUILD_DIR/${CIRCUIT_NAME}.r1cs"
PTAU="$ROOT_DIR/circuits/artifacts/powersOfTau28_hez_final_12.ptau"
ZKEY_0000="$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"
ZKEY_FINAL="$BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
VKEY="$BUILD_DIR/verification_key.json"
WITNESS="$BUILD_DIR/witness.wtns"
PROOF="$BUILD_DIR/proof.json"
PUBLIC="$BUILD_DIR/public.json"

compile() {
  bash "$COMPILE_SCRIPT" >/dev/null
}

witness() {
  compile
  node "$WITNESS_JS" "$WASM" "$FIXTURE" "$WITNESS" >/dev/null
}

setup() {
  compile
  if [[ -f "$ZKEY_FINAL" && -f "$VKEY" ]]; then
    return
  fi
  bash "$ROOT_DIR/circuits/scripts/ensure-dev-ptau.sh" >/dev/null
  pnpm exec snarkjs groth16 setup "$R1CS" "$PTAU" "$ZKEY_0000" >/dev/null
  pnpm exec snarkjs zkey contribute \
    "$ZKEY_0000" \
    "$ZKEY_FINAL" \
    --name="Pact local dev zkey" \
    -e="pact-local-dev-zkey" >/dev/null
  pnpm exec snarkjs zkey export verificationkey "$ZKEY_FINAL" "$VKEY" >/dev/null
}

prove() {
  setup
  witness
  pnpm exec snarkjs groth16 prove "$ZKEY_FINAL" "$WITNESS" "$PROOF" "$PUBLIC" >/dev/null
}

verify() {
  if [[ ! -f "$VKEY" || ! -f "$PUBLIC" || ! -f "$PROOF" ]]; then
    prove
  fi
  pnpm exec snarkjs groth16 verify "$VKEY" "$PUBLIC" "$PROOF"
}

case "$COMMAND" in
  compile) compile ;;
  witness) witness ;;
  setup) setup ;;
  prove) prove ;;
  verify) verify ;;
  all)
    prove
    verify
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
