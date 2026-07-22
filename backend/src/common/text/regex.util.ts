/** Escape a string so it can be embedded literally inside a `RegExp` pattern. */
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Build a case-insensitive `^(<proto>|…)://` matcher from a list of URL protocols. */
export const buildProtocolPattern = (protocols: string[]): RegExp =>
    new RegExp(`^(${protocols.map(escapeRegExp).join("|")})://`, "i");
