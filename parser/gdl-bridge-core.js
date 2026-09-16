/**
 * Browser-safe GDL bridge client (HTTP only).
 */

/** @param {unknown} payload @param {string} kind */
export function assertClean(payload, kind) {
  const diagnostics = payload?.diagnostics;
  if (Array.isArray(diagnostics) && diagnostics.length) {
    const msg = diagnostics.map((d) => `${d.line}: ${d.message}`).join("; ");
    throw new Error(`VisionGdlBridge ${kind}: ${msg}`);
  }
  return payload;
}

/** @param {string} kind @param {string} gdlText @param {string} endpoint */
export async function invokeGdlBridgeAsync(kind, gdlText, endpoint) {
  if (!endpoint) {
    throw new Error(`VisionGdlBridge ${kind}: gdlEndpoint is required in browser`);
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, text: gdlText }),
  });
  if (!res.ok) throw new Error(`VisionGdlBridge HTTP ${res.status}: ${await res.text()}`);
  return assertClean(await res.json(), kind);
}
