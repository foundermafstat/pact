#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/circuits/artifacts"
FINAL_PTAU="$ARTIFACT_DIR/powersOfTau28_hez_final_12.ptau"

mkdir -p "$ARTIFACT_DIR"

if [[ -f "$FINAL_PTAU" ]]; then
  exit 0
fi

pnpm exec snarkjs powersoftau new bn128 12 "$ARTIFACT_DIR/pot12_0000.ptau" -v
pnpm exec snarkjs powersoftau contribute \
  "$ARTIFACT_DIR/pot12_0000.ptau" \
  "$ARTIFACT_DIR/pot12_0001.ptau" \
  --name="Pact local dev contribution" \
  -v \
  -e="pact-local-dev"
pnpm exec snarkjs powersoftau prepare phase2 \
  "$ARTIFACT_DIR/pot12_0001.ptau" \
  "$FINAL_PTAU" \
  -v
