export function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function slug(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "line";
}

export function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function stableLineId(scope, key, text) {
  return `${slug(scope)}-${slug(key)}-${fnv1a(cleanText(text))}`;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

