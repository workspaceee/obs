export const RANKS = [
  { id: 1, name: "HERALD", ru: "Рекрут" },
  { id: 2, name: "GUARDIAN", ru: "Страж" },
  { id: 3, name: "CRUSADER", ru: "Рыцарь" },
  { id: 4, name: "ARCHON", ru: "Герой" },
  { id: 5, name: "LEGEND", ru: "Легенда" },
  { id: 6, name: "ANCIENT", ru: "Властелин" },
  { id: 7, name: "DIVINE", ru: "Божество" },
  { id: 8, name: "IMMORTAL", ru: "Титан" },
];

export const rankName = (id) => RANKS.find((r) => r.id === id)?.name || "UNKNOWN";

export function immortalTier(place) {
  if (!place) return { file: "top0", label: "IMMORTAL" };
  if (place <= 1) return { file: "top4", label: "TOP 1" };
  if (place <= 10) return { file: "top3", label: "TOP 10" };
  if (place <= 100) return { file: "top2", label: "TOP 100" };
  if (place <= 1000) return { file: "top1", label: "TOP 1000" };
  return { file: "top0", label: "IMMORTAL" };
}

export function medalSrc(slot) {
  if (!slot) return "/medals/0-0.png";
  if (slot.rank === 8) return `/medals/${immortalTier(slot.place).file}.png`;
  const s = Math.min(5, Math.max(1, slot.stars || 1));
  return `/medals/${slot.rank}-${s}.png`;
}

export const slotKey = (slot) => (slot ? `${slot.rank}-${slot.stars}-${slot.place || 0}` : "none");

// comparable value for "goal reached"
export const slotValue = (slot) => {
  if (!slot) return 0;
  if (slot.rank === 8) return 100 + (slot.place ? 100000 - slot.place : 0);
  return slot.rank * 10 + (slot.stars || 0);
};

export const ALL_MEDALS = [
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((r) => [1, 2, 3, 4, 5].map((s) => `/medals/${r}-${s}.png`)),
  ...[0, 1, 2, 3, 4].map((i) => `/medals/top${i}.png`),
];
