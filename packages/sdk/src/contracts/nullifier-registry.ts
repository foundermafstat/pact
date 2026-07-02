import type { ContractInvocationTransport } from "./transport";
import { assertContractId } from "./transport";

export class NullifierRegistryClient {
  private readonly contractId: string;

  public constructor(
    contractId: string | undefined,
    private readonly transport: ContractInvocationTransport
  ) {
    this.contractId = assertContractId("NullifierRegistry", contractId);
  }

  public isUsed(nullifier: string) {
    return this.transport.invoke<boolean>({
      contractId: this.contractId,
      method: "is_used",
      args: [nullifier]
    });
  }
}
