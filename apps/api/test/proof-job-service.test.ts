import { beforeEach, describe, expect, it } from "vitest";

import { proofJobService } from "../src/services/proof-job-service";

describe("ProofJobService", () => {
  beforeEach(async () => {
    await proofJobService.reset();
  });

  it("tracks queued, running, and succeeded proof jobs", async () => {
    const queued = await proofJobService.createJob({
      proofType: "Eligibility",
      requestJson: {
        credentialId: "11111111-1111-4111-8111-111111111111"
      }
    });
    const running = await proofJobService.startJob(queued.id);
    const succeeded = await proofJobService.completeJob(queued.id, {
      publicInputsJson: {
        nullifier: "0x01"
      },
      proofJson: {
        mode: "local"
      }
    });

    expect(queued.status).toBe("Queued");
    expect(running?.status).toBe("Running");
    expect(succeeded?.status).toBe("Succeeded");
    expect(succeeded?.proofJson).toEqual({
      mode: "local"
    });
    expect(succeeded?.completedAt).not.toBeNull();
  });

  it("tracks failed proof jobs with an error message", async () => {
    const queued = await proofJobService.createJob({
      proofType: "MilestoneUnlock",
      requestJson: {
        programId: "11111111-1111-4111-8111-111111111111",
        milestoneKey: "M1"
      }
    });
    const failed = await proofJobService.failJob(queued.id, "invalid milestone input");

    expect(failed?.status).toBe("Failed");
    expect(failed?.error).toBe("invalid milestone input");
    expect(failed?.proofJson).toBeNull();
    expect((await proofJobService.getJob(queued.id))?.status).toBe("Failed");
  });
});
