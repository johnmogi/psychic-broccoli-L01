export type Element = "air" | "fire" | "water" | "earth";
export type Color = "black" | "red";
export type Court = "prince" | "queen" | "king";
export type Back = "sun" | "moon";

export interface MinorCard {
  id: string;
  name: string;
  element: Element;
  rank: number;
  arcana: "minor";
}

export interface MajorCard {
  id: string;
  name: string;
  element: Element;
  rank: null;
  arcana: "major";
  court: Court;
  back: Back;
}

export type CatalogCard = MinorCard | MajorCard;

export const ELEMENTS: readonly Element[] = ["earth", "water", "fire", "air"];
export const COURTS: readonly Court[] = ["prince", "queen", "king"];
export const BACKS: readonly Back[] = ["sun", "moon"];

const ELEMENT_NAME: Record<Element, string> = {
  earth: "Earth",
  water: "Water",
  fire: "Fire",
  air: "Air",
};

/** Black is Air and Fire. Red is Water and Earth. */
const COLOR: Record<Element, Color> = {
  air: "black",
  fire: "black",
  water: "red",
  earth: "red",
};

const SUIT: Record<Element, string> = {
  air: "spades",
  fire: "clubs",
  water: "hearts",
  earth: "diamonds",
};

export function elementColor(element: Element): Color {
  return COLOR[element];
}

export function suitOf(element: Element): string {
  return SUIT[element];
}

export function minor(element: Element, rank: number): MinorCard {
  if (rank < 1 || rank > 9) throw new Error(`Minor rank ${rank} is outside 1–9`);
  const label = rank === 1 ? "Ace" : String(rank);
  return {
    id: `minor-${element}-${rank}`,
    name: `${label} of ${ELEMENT_NAME[element]}`,
    element,
    rank,
    arcana: "minor",
  };
}

export function formatCard(card: Pick<MinorCard, "rank" | "element">): string {
  const rank = card.rank === 1 ? "A" : String(card.rank);
  return `${rank} ${card.element.toUpperCase()}`;
}

export function major(back: Back, element: Element, court: Court): MajorCard {
  return {
    id: `major-${back}-${element}-${court}`,
    name: `${title(back)} ${title(court)} of ${ELEMENT_NAME[element]}`,
    element,
    rank: null,
    arcana: "major",
    court,
    back,
  };
}

/** Prince, Queen, and King across four elements and Sun/Moon backs. 24 majors. */
export function createMajorCatalog(): MajorCard[] {
  const cards: MajorCard[] = [];
  for (const court of COURTS) {
    for (const element of ELEMENTS) {
      for (const back of BACKS) cards.push(major(back, element, court));
    }
  }
  return cards;
}

export function formatMajor(card: Pick<MajorCard, "back" | "court" | "element">): string {
  return `${title(card.back)} ${title(card.court)} of ${ELEMENT_NAME[card.element]}`;
}

export function formatAnyCard(card: { rank?: number | null; element: string; arcana?: string; court?: Court; back?: Back }): string {
  if (card.arcana === "major" && card.court && card.back) return formatMajor({ back: card.back, court: card.court, element: card.element as Element });
  const rank = typeof card.rank === "number" ? card.rank : 0;
  return formatCard({ rank, element: card.element as Element });
}

/** Full catalog: minors Ace–9 and the 24-major court. No tens. */
export function createCardDatabase(): CatalogCard[] {
  const cards: CatalogCard[] = [];
  for (const element of ELEMENTS) {
    for (let rank = 1; rank <= 9; rank += 1) cards.push(minor(element, rank));
  }
  cards.push(...createMajorCatalog());
  return cards;
}

function title(word: string): string {
  return `${word[0]!.toUpperCase()}${word.slice(1)}`;
}

/** One minor of each element, ranks Ace through 6. */
export function createL01Pool(): MinorCard[] {
  const cards: MinorCard[] = [];
  for (const element of ELEMENTS) {
    for (let rank = 1; rank <= 6; rank += 1) cards.push(minor(element, rank));
  }
  return cards;
}
