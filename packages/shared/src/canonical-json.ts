type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const isPlainObject = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

export const canonicalizeJson = (value: JsonValue): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }

  if (!isPlainObject(value)) {
    throw new Error("Only JSON-compatible plain objects can be canonicalized");
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeJson(item)}`)
    .join(",")}}`;
};

export type { JsonValue };
