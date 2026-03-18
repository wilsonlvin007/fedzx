export function parseJsonStringArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((x): x is string => typeof x === "string");
  if (typeof input !== "string") return [];
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

