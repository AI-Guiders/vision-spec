import { deckZoneIdsFromScreen, parseScreenLine } from "./parse.js";
import { renderDeckScreen } from "./render.js";

export const aiguidersMentalModel = {
  id: "aiguiders-mental-model",

  parseScreenLine(ctx, trimmed) {
    return parseScreenLine(ctx.screen, trimmed, ctx.doc);
  },

  deckZoneIds(screen) {
    return deckZoneIdsFromScreen(screen);
  },

  renderScreen(screen, helpers) {
    if (!screen.deck) return null;
    return renderDeckScreen(screen, helpers);
  },
};
