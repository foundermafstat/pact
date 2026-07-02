export type ContractInvocation = {
  contractId: string;
  method: string;
  args: unknown[];
};

export type ContractInvocationResult<T> = {
  txHash?: string;
  result: T;
};

export type ContractInvocationTransport = {
  invoke: <T>(invocation: ContractInvocation) => Promise<ContractInvocationResult<T>>;
};

export class MissingContractIdError extends Error {
  public constructor(contractName: string) {
    super(`Missing contract id for ${contractName}`);
  }
}

export const assertContractId = (
  contractName: string,
  contractId: string | undefined
): string => {
  if (!contractId) {
    throw new MissingContractIdError(contractName);
  }

  return contractId;
};
