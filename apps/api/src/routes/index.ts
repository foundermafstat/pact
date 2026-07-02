import type { FastifyInstance } from "fastify";

import { registerAttestorRoutes } from "./attestor";
import { registerIssuerRoutes } from "./issuer";
import { registerPolicyRoutes } from "./policies";
import { registerProgramRoutes } from "./programs";
import { registerProofRoutes } from "./proofs";

export const registerApiRoutes = async (app: FastifyInstance): Promise<void> => {
  await app.register(registerProgramRoutes);
  await app.register(registerPolicyRoutes);
  await app.register(registerIssuerRoutes);
  await app.register(registerAttestorRoutes);
  await app.register(registerProofRoutes);
};
