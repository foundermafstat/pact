import type { ContractInvocationTransport } from "./transport";
import { assertContractId } from "./transport";

export class PolicyRegistryClient {
  private readonly contractId: string;

  public constructor(
    contractId: string | undefined,
    private readonly transport: ContractInvocationTransport
  ) {
    this.contractId = assertContractId("PolicyRegistry", contractId);
  }

  public createPolicy(args: {
    policyId: string;
    policyHash: string;
    policyType: string;
    verifier: string;
    validFrom: number;
    validUntil: number;
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "create_policy",
      args: [
        args.policyId,
        args.policyHash,
        args.policyType,
        args.verifier,
        args.validFrom,
        args.validUntil
      ]
    });
  }

  public activatePolicy(policyId: string) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "activate_policy",
      args: [policyId]
    });
  }
}
