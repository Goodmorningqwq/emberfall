import type { ItemId } from "./store";

/** What the two vendors sell. Prices are tuned so one dungeon clear (~90 gold) buys one real upgrade. */
export interface ShopEntry {
  id: string;
  name: string;
  icon: ItemId | "heart" | "sword2" | "sword3" | "armor1" | "armor2";
  price: number;
  effect: string; // the delta the card shows
  /** an item to add, or an upgrade flag */
  give?: { item: ItemId; qty: number; max: number };
  upgrade?: "sword2" | "sword3" | "heart" | "armor1" | "armor2";
}

export const SHOPS: Record<"apothecary" | "blacksmith", { title: string; greeting: string; entries: ShopEntry[] }> = {
  apothecary: {
    title: "APOTHECARY · Maren",
    greeting: "Potions for coin, dear. Bombs too, if you promise not to use them indoors.",
    entries: [
      { id: "potion", name: "Potion", icon: "potion", price: 20, effect: "Heals 3 hearts", give: { item: "potion", qty: 1, max: 5 } },
      { id: "bomb", name: "Bomb", icon: "bomb", price: 15, effect: "Breaks cracked walls", give: { item: "bomb", qty: 1, max: 5 } },
      { id: "heart", name: "Heart Container", icon: "heart", price: 120, effect: "+1 max heart", upgrade: "heart" },
    ],
  },
  blacksmith: {
    title: "BLACKSMITH · Orrin",
    greeting: "Bring me gold and I'll put an edge on that sword you'd not believe.",
    entries: [
      { id: "sword2", name: "Tempered Sword", icon: "sword2", price: 80, effect: "2 dmg per strike", upgrade: "sword2" },
      { id: "sword3", name: "Ember-forged Sword", icon: "sword3", price: 200, effect: "3 dmg per strike", upgrade: "sword3" },
      { id: "armor1", name: "Leather Jerkin", icon: "armor1", price: 60, effect: "Every 3rd hit glances off", upgrade: "armor1" },
      { id: "armor2", name: "Iron Cuirass", icon: "armor2", price: 160, effect: "Every 2nd hit glances off", upgrade: "armor2" },
    ],
  },
};
