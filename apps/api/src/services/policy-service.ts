import { randomUUID } from "node:crypto";

import type { CreatePolicyRequest, PolicyDto, PolicyStatus } from "@pact/shared";
import { hashPolicy } from "@pact/shared";

const now = (): string => new Date().toISOString();

export class PolicyService {
  private readonly policies = new Map<string, PolicyDto>();

  public createPolicy(input: CreatePolicyRequest): PolicyDto {
    const createdAt = now();
    const policy: PolicyDto = {
      id: randomUUID(),
      policyKey: input.policy.policyKey,
      policyHash: hashPolicy(input.policy),
      policyType: input.policy.policyType,
      status: "Draft",
      rawPolicyJson: input.policy,
      createdAt,
      updatedAt: createdAt
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  public getPolicy(policyId: string): PolicyDto | undefined {
    return this.policies.get(policyId);
  }

  public setStatus(policyId: string, status: PolicyStatus): PolicyDto | undefined {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return undefined;
    }

    const updatedPolicy = {
      ...policy,
      status,
      updatedAt: now()
    };

    this.policies.set(policyId, updatedPolicy);
    return updatedPolicy;
  }
}

export const policyService = new PolicyService();
