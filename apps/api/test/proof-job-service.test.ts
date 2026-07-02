import { beforeEach, describe, expect, it } from "vitest";

import { proofJobService } from "../src/services/proof-job-service";

describe("ProofJobService", () => {
  beforeEach(() => {
    proofJobService.reset();
  });

  it("tracks queued, running, and succeeded proof jobs", () => {
    const queued = proofJobService.createJob({
      proofType: "Eligibility",
      requestJson: {
        credentialId: "11111111-1111-4111-8111-111111111111"
      }
    });
    const running = proofJobService.startJob(queued.id);
    const succeeded = proofJobService.completeJob(queued.id, {
      publicInputsJson: {
        nullifier: "0x01"
      },
      proofJson: {
        mode: "mock"
      }
    });

    expect(queued.status).toBe("Queued");
    expect(running?.status).toBe("Running");
    expect(succeeded?.status).toBe("Succeeded");
    expect(succeeded?.proofJson).toEqual({
      mode: "mock"
    });
    expect(succeeded?.completedAt).not.toBeNull();
  });

  it("tracks failed proof jobs with an error message", () => {
    const queued = proofJobService.createJob({
      proofType: "MilestoneUnlock",
      requestJson: {
        programId: "11111111-1111-4111-8111-111111111111",
        milestoneKey: "M1"
      }
    });
    const failed = proofJobService.failJob(queued.id, "invalid milestone input");

    expect(failed?.status).toBe("Failed");
    expect(failed?.error).toBe("invalid milestone input");
    expect(failed?.proofJson).toBeNull();
    expect(proofJobService.getJob(queued.id)?.status).toBe("Failed");
  });
});
