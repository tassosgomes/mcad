export function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0);
  }

  return value?.trim() || undefined;
}

export function toFetchHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const normalizedValue = Array.isArray(value) ? value.join(',') : value;

    if (normalizedValue !== undefined) {
      output[name] = normalizedValue;
    }
  }

  return output;
}
