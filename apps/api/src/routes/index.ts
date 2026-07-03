import type { FastifyInstance } from "fastify";

import { registerAttestorRoutes } from "./attestor";
import { registerAuthRoutes } from "./auth";
import { registerIssuerRoutes } from "./issuer";
import { registerMarketplaceRoutes } from "./marketplace";
import { registerPolicyRoutes } from "./policies";
import { registerProgramRoutes } from "./programs";
import { registerProofRoutes } from "./proofs";
import { registerStripeIntegrationRoutes } from "./stripe-integration";

export const registerApiRoutes = async (app: FastifyInstance): Promise<void> => {
  await app.register(registerAuthRoutes);
  await app.register(registerMarketplaceRoutes);
  await app.register(registerProgramRoutes);
  await app.register(registerPolicyRoutes);
  await app.register(registerIssuerRoutes);
  await app.register(registerAttestorRoutes);
  await app.register(registerProofRoutes);
  await app.register(registerStripeIntegrationRoutes);
};
