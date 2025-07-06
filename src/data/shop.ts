import type { ShopItem } from "../types";

export const shopItems: { [key: string]: ShopItem } = {
  wooden_spoon: {
    name: "Wooden Spoon",
    description: "+1 cookie per click",
    cost: 50,
    type: "multiplier",
    value: 1,
  },
  silver_spatula: {
    name: "Silver Spatula",
    description: "+5 cookies per click",
    cost: 200,
    type: "multiplier",
    value: 5,
  },
  golden_whisk: {
    name: "Golden Whisk",
    description: "+20 cookies per click",
    cost: 1000,
    type: "multiplier",
    value: 20,
  },
  cookie_mouse: {
    name: "Cookie Mouse",
    description: "Auto-clicks 1 cookie every 60 seconds",
    cost: 100,
    type: "autoclicker",
    value: 1,
    interval: 60000,
  },
  baking_bot: {
    name: "Baking Bot",
    description: "Auto-clicks 5 cookies every 45 seconds",
    cost: 500,
    type: "autoclicker",
    value: 5,
    interval: 45000,
  },
  cookie_factory: {
    name: "Cookie Factory",
    description: "Auto-clicks 15 cookies every 30 seconds",
    cost: 2500,
    type: "autoclicker",
    value: 15,
    interval: 30000,
  },
};

export type { ShopItem };
