/** An expected failure is a value: the caller must handle both arms. The repo's one result type. */
export type Result<Value, Failure> =
  { readonly ok: true; readonly value: Value } | { readonly ok: false; readonly error: Failure };
