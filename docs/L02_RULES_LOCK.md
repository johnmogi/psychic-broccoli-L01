# L02 rules lock

L02 is the first real playable layer. Later play starts here: evolve, collect into hand, move the round table, pressure the altar, and touch the veil.

L01 stays the frozen card-state grammar. L02 does not change it.

## Still out

Majors, courts, Eclipse, triangulation, the event die, barriers, combat, health, and the negotiation bowl. No browser.

## Deal

- Ace through 6 in play. Ranks 7–9 stay in the database and out of the deal. No tens. No majors.
- P1 starts on the Fire Ace. P2 starts on the Water Ace. Those aces leave the pool.
- Two starting hand cards. Three round-table slots. Altar capacity 3 minors. Veil is ordered history.

## Turn

1. Fill empty round-table slots from the deck, left to right.
2. The active player collects one round-table card into hand. The default bot takes the leftmost card.
3. The active player may evolve from legal hand cards. Legality is the L01 check: `sameColor` or `sameElement`, jump `1` or `2`. Default is same color and jump 2. Lineage stays a stack.
4. The active player may use one elemental veil effect if it is legal.
5. Round-table cards that were not collected go to the altar.
6. If the altar has more than 3 minors, overflow sends cards to the veil. Default is the oldest minor. `altarOverflowMode: "activeChoice"` is typed and not implemented.
7. The other player becomes active.

Default length is 6 turns. `handLimit` defaults to unlimited.

The default bot evolves before it touches the veil. It uses an effect only when that turn produced no evolution. Water resurface is tried before Air swap.

## Veil effects

Water resurface spends one Water card from hand and moves the current veil top to the altar. The spent card is discarded onto the veil after that top is taken, so the spend is not the card that resurfaces. Altar overflow still applies.

Air swap spends one Air card and exchanges the leftmost round-table card with the veil top. The spent Air card then goes to the veil. An empty veil makes either effect illegal. `maxElementalEffectsPerTurn` defaults to 1.

## Metrics

Logs and stats are folded from structured events: final rank, rank 6 rate, rank distribution, evolutions, cards collected, hand evolutions, altar sends, overflows, veil count, Water resurfaces, Air swaps, cards recovered from the veil, average hand size, and deck exhaustion.
