import type { ContractInvocationTransport } from "./transport";
import { assertContractId } from "./transport";

export class RootRegistryClient {
  private readonly contractId: string;

  public constructor(
    contractId: string | undefined,
    private readonly transport: ContractInvocationTransport
  ) {
    this.contractId = assertContractId("RootRegistry", contractId);
  }

  public activateRoot(args: {
    policyId: string;
    root: string;
    rootType: string;
    epoch: number;
    validFrom: number;
    validUntil: number;
  }) {
    return this.transport.invoke<void>({
      contractId: this.contractId,
      method: "activate_root",
      args: [
        args.policyId,
        args.root,
        args.rootType,
        args.epoch,
        args.validFrom,
        args.validUntil
      ]
    });
  }
}
