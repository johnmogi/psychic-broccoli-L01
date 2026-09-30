# L01 rules lock

Nexus Dungeon Master Layer 01. Card-state grammar only.

- Deal minors Ace through 6. Four elements: Air, Fire, Water, Earth.
- Ranks 7–9 stay in the card database and out of the deal.
- No tens.
- Majors stay in the catalog and out of the deal.
- Two players.
- P1 starts with the Fire Ace. P2 starts with the Water Ace. Assigned aces leave the pool.
- Two hand cards each.
- Default length is 4 turns: P1, P2, P1, P2. `turnCount` is configurable.
- Three round-table slots. No Parallel Dimension behavior on the rightmost slot.
- Lineage is a card stack. No separate rank field. Top card is current.
- Legal evolution: higher rank, matching alignment, jump no larger than `maxJump`.
- Alignment: `sameColor` or `sameElement`. Default `sameColor`.
- Jump: `1` or `2`. Default `2`.
- Black = Air + Fire. Red = Water + Earth.
- Encounter and hand share one legality check.
- Bot order: legal encounter, then hand order, repeating until blocked or `maxEvolutionsPerTurn` is reached. Default `unlimited`.
- Unused encounter goes to the altar at the next turn start.
- Altar: 3 minors and one empty major slot. Overflow sends the oldest minor to the veil.
- Veil is ordered history.
- Empty deck: leave the slot empty and emit `DECK EXHAUSTED`.
- Same seed and config: same structured events.
- Logs and stats are derived from those events.
- Seed `tutorial` is scripted. Other seeds are the balance lab.

Out of L01: browser UI, health, dice, barriers, combat, majors in play, Eclipse, triangulation.
