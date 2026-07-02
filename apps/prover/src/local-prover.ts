import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";

import type { ProofType } from "@pact/shared";

import type { ProofJobPayload, ProofProcessorResult } from "./proof-processor";

const execFileAsync = promisify(execFile);

type CircuitConfig = {
  pipelineName: "eligibility" | "milestone";
  buildDir: string;
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const findRepoRoot = async (startDir: string): Promise<string> => {
  let currentDir = resolve(startDir);
  while (currentDir !== dirname(currentDir)) {
    if (await fileExists(join(currentDir, "circuits", "scripts", "snarkjs-pipeline.sh"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  throw new Error("Unable to locate Pact repo root for local proving");
};

const getCircuitConfig = (proofType: ProofType, repoRoot: string): CircuitConfig => {
  if (proofType === "Eligibility") {
    return {
      pipelineName: "eligibility",
      buildDir: join(repoRoot, "circuits", "eligibility-proof", "build")
    };
  }

  return {
    pipelineName: "milestone",
    buildDir: join(repoRoot, "circuits", "milestone-unlock-proof", "build")
  };
};

export const generateLocalProof = async (
  payload: ProofJobPayload
): Promise<ProofProcessorResult> => {
  const repoRoot = await findRepoRoot(process.cwd());
  const circuit = getCircuitConfig(payload.proofType, repoRoot);
  const fixturePath =
    typeof payload.requestJson["fixturePath"] === "string"
      ? payload.requestJson["fixturePath"]
      : undefined;
  const args = [
    join(repoRoot, "circuits", "scripts", "snarkjs-pipeline.sh"),
    circuit.pipelineName,
    "all"
  ];

  if (fixturePath) {
    args.push(fixturePath);
  }

  await execFileAsync("bash", args, {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 8
  });

  const proof = JSON.parse(await readFile(join(circuit.buildDir, "proof.json"), "utf8"));
  const publicInputs = JSON.parse(
    await readFile(join(circuit.buildDir, "public.json"), "utf8")
  );

  return {
    proofJson: {
      mode: "local",
      proof,
      generatedAt: new Date().toISOString()
    },
    publicInputsJson: {
      orderedPublicInputs: publicInputs
    }
  };
};
