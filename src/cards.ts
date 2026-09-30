export type Element = "air" | "fire" | "water" | "earth";
export type Color = "black" | "red";
export type Court = "prince" | "queen" | "king";

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
}

export type CatalogCard = MinorCard | MajorCard;

export const ELEMENTS: readonly Element[] = ["earth", "water", "fire", "air"];

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

/** Full catalog: minors Ace–9 and twelve royals. No tens. */
export function createCardDatabase(): CatalogCard[] {
  const cards: CatalogCard[] = [];
  for (const element of ELEMENTS) {
    for (let rank = 1; rank <= 9; rank += 1) cards.push(minor(element, rank));
    for (const court of ["prince", "queen", "king"] as const) {
      cards.push({
        id: `major-${element}-${court}`,
        name: `${court[0]!.toUpperCase()}${court.slice(1)} of ${ELEMENT_NAME[element]}`,
        element,
        rank: null,
        arcana: "major",
        court,
      });
    }
  }
  return cards;
}

/** One minor of each element, ranks Ace through 6. */
export function createL01Pool(): MinorCard[] {
  const cards: MinorCard[] = [];
  for (const element of ELEMENTS) {
    for (let rank = 1; rank <= 6; rank += 1) cards.push(minor(element, rank));
  }
  return cards;
}
