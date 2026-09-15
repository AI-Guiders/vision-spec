/** Built-in VisionSpec plugins (v1 — static registry). */

const registry = new Map();

export function registerPlugin(plugin) {
  if (!plugin?.id) throw new Error("Plugin must have id");
  registry.set(plugin.id, plugin);
}

export function getPlugin(id) {
  return registry.get(id) ?? null;
}

export function resolvePlugins(doc) {
  const ids = doc.plugins ?? [];
  return ids.map((id) => {
    const plugin = getPlugin(id);
    if (!plugin) throw new Error(`Unknown plugin: ${id}`);
    return plugin;
  });
}

export function deckZoneIds(screen, plugins) {
  const ids = new Set();
  for (const plugin of plugins) {
    if (typeof plugin.deckZoneIds === "function") {
      for (const z of plugin.deckZoneIds(screen)) ids.add(z);
    }
  }
  return ids;
}
