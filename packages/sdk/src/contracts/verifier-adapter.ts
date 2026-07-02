import type { ContractInvocationTransport } from "./transport";
import { assertContractId } from "./transport";

export class VerifierAdapterClient {
  private readonly contractId: string;

  public constructor(
    contractId: string | undefined,
    private readonly transport: ContractInvocationTransport
  ) {
    this.contractId = assertContractId("VerifierAdapter", contractId);
  }

  public verifyMilestone(proof: string, publicInputs: string) {
    return this.transport.invoke<boolean>({
      contractId: this.contractId,
      method: "verify_milestone",
      args: [proof, publicInputs]
    });
  }
}
