export type DerbyHorse = {
  id: string;
  name: string;
  odds: string;
  price: number;
  longshot: boolean; // 40-1+ odds — eligible for 2x bonus if finishing top 3
};

export const DERBY_HORSES: DerbyHorse[] = [
  { id: "renegade", name: "Renegade", odds: "7-2", price: 45, longshot: false },
  { id: "further-ado", name: "Further Ado", odds: "9-2", price: 35, longshot: false },
  { id: "commandment", name: "Commandment", odds: "5-1", price: 35, longshot: false },
  { id: "so-happy", name: "So Happy", odds: "10-1", price: 20, longshot: false },
  { id: "chief-wallabee", name: "Chief Wallabee", odds: "10-1", price: 20, longshot: false },
  { id: "the-puma", name: "The Puma", odds: "10-1", price: 20, longshot: false },
  { id: "emerging-market", name: "Emerging Market", odds: "18-1", price: 10, longshot: false },
  { id: "danon-bourbon", name: "Danon Bourbon", odds: "18-1", price: 10, longshot: false },
  { id: "fulleffort", name: "Fulleffort", odds: "20-1", price: 10, longshot: false },
  { id: "potente", name: "Potente", odds: "20-1", price: 10, longshot: false },
  { id: "silent-tactic", name: "Silent Tactic", odds: "25-1", price: 10, longshot: false },
  { id: "incredibolt", name: "Incredibolt", odds: "30-1", price: 5, longshot: false },
  { id: "golden-tempo", name: "Golden Tempo", odds: "30-1", price: 5, longshot: false },
  { id: "wonder-dean", name: "Wonder Dean", odds: "30-1", price: 5, longshot: false },
  { id: "six-speed", name: "Six Speed", odds: "30-1", price: 5, longshot: false },
  { id: "albus", name: "Albus", odds: "40-1", price: 5, longshot: true },
  { id: "pavlovian", name: "Pavlovian", odds: "40-1", price: 5, longshot: true },
  { id: "right-to-party", name: "Right to Party", odds: "40-1", price: 5, longshot: true },
  { id: "stark-contrast", name: "Stark Contrast", odds: "50-1", price: 5, longshot: true },
  { id: "chip-honcho", name: "Chip Honcho", odds: "50-1", price: 5, longshot: true },
];

export const DERBY_CAP = 100;
export const DERBY_STABLE_SIZE = 3;

export const HORSE_BY_ID = new Map(DERBY_HORSES.map((h) => [h.id, h]));
