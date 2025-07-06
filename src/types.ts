export interface ShopItem {
  name: string;
  description: string;
  cost: number;
  type: "multiplier" | "autoclicker";
  value: number;
  interval?: number;
}

export type ShopItems = Record<string, ShopItem>;

export type Cookies = Record<string, number>;
export type DailyClaims = Record<string, number>;
export type Inventories = Record<string, Record<string, number>>;
