import { registerPlugin } from "./plugin-registry.js";
import { aiguidersMentalModel } from "../plugins/aiguiders-mental-model/index.js";

registerPlugin(aiguidersMentalModel);

export { resolvePlugins, getPlugin, deckZoneIds } from "./plugin-registry.js";
