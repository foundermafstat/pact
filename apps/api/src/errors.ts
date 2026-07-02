import type { FastifyError, FastifyInstance } from "fastify";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: FastifyError | ApiError, _request, reply) => {
    const statusCode =
      error instanceof ApiError ? error.statusCode : error.statusCode ?? 500;

    const response: ErrorResponse = {
      error: {
        code: error instanceof ApiError ? error.code : "internal_error",
        message:
          statusCode >= 500 ? "Internal server error" : error.message
      }
    };

    if (error instanceof ApiError && error.details !== undefined) {
      response.error.details = error.details;
    }

    reply.status(statusCode).send(response);
  });
};
