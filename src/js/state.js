// Definice počátečního stavu hry a katalog generátorů.
// Vše je data-driven, takže se obsah hry dá rozšiřovat bez zásahu do logiky.

export const SAVE_KEY = 'prosperity.save.v1';
export const SAVE_VERSION = 1;

// Katalog generátorů pasivního příjmu.
// baseCost      – cena prvního kusu
// costGrowth    – o kolik se cena násobí s každým zakoupeným kusem
// baseProduction – kolik 💰/s vyrobí jeden kus
export const GENERATORS = [
  { id: 'stand',   name: 'Stánek',    icon: '🛒', baseCost: 15,      costGrowth: 1.15, baseProduction: 0.1 },
  { id: 'shop',    name: 'Obchod',    icon: '🏪', baseCost: 100,     costGrowth: 1.15, baseProduction: 1 },
  { id: 'cafe',    name: 'Kavárna',   icon: '☕', baseCost: 1_100,    costGrowth: 1.15, baseProduction: 8 },
  { id: 'factory', name: 'Továrna',   icon: '🏭', baseCost: 12_000,   costGrowth: 1.15, baseProduction: 47 },
  { id: 'bank',    name: 'Banka',     icon: '🏦', baseCost: 130_000,  costGrowth: 1.15, baseProduction: 260 },
  { id: 'tower',   name: 'Mrakodrap', icon: '🏙️', baseCost: 1_400_000, costGrowth: 1.15, baseProduction: 1_400 },
];

// Hodnota jednoho ručního kliknutí.
export const CLICK_VALUE = 1;

export function createInitialState() {
  return {
    version: SAVE_VERSION,
    money: 0,
    totalEarned: 0,
    // Počet vlastněných kusů pro každý generátor podle id.
    owned: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    lastSaved: Date.now(),
  };
}
