import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

export type ApiConfig = {
  nodeEnv: string;
  appEnv: string;
  host: string;
  port: number;
  corsOrigin: string;
};

const readNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsedValue;
};

export const loadApiConfig = (): ApiConfig => ({
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  appEnv: process.env["APP_ENV"] ?? "local",
  host: process.env["API_HOST"] ?? "127.0.0.1",
  port: readNumber(process.env["API_PORT"], 4000),
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000"
});

export const getDatabaseUrl = (): string =>
  process.env["DATABASE_URL"] ?? "postgresql://pact:pact@localhost:5432/pact";
