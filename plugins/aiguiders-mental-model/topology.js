/** Parse federation topology wire for alignment sketch (not prod IR). */

/** @param {string | null | undefined} topology */
export function parseTopologyGroups(topology) {
  if (!topology) return [];
  return [...topology.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim()).filter(Boolean);
}

/** Two dedicated host groups without slash → MultiHost, not OneOf (F/M). */
export function isMultiHostTopology(topology) {
  const groups = parseTopologyGroups(topology);
  return groups.length === 2 && !groups.some((g) => g.includes("/"));
}

/** @param {string} group */
export function hostBandForGroup(group) {
  const token = group.split(/[/+]/)[0]?.trim().toUpperCase() ?? "";
  if (token === "F" || token === "FORWARD") return "forward";
  if (token === "MFD" || token === "M") return "mfd";
  if (token === "P" || token === "PFD") return "pfd";
  return null;
}
