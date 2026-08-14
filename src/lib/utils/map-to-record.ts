/**
 * Serializes server Maps whenever React Server Components pass grouped edition data into client components.
 * @param sourceMap - String-keyed Map returned by the query layer.
 * @returns Plain record containing the same entries.
 * @example
 * mapToRecord(new Map([["hackernews", []]])) // => { hackernews: [] }
 */
export function mapToRecord<Key extends string, Value>(
  sourceMap: Map<Key, Value>,
): Record<string, Value> {
  const record: Record<string, Value> = {};
  for (const [key, value] of sourceMap) record[key] = value;
  return record;
}
