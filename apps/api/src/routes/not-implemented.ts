import type { FastifyReply, FastifyRequest } from "fastify";

import { ApiError } from "../errors";

export const notImplementedHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<never> => {
  throw new ApiError(
    501,
    "not_implemented",
    `Route ${request.method} ${request.url} is not implemented yet`
  );
};
