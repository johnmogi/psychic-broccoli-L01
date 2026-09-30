# psychic-broccoli-L01

Nexus Dungeon Master, Layer 01.

This package is the deterministic card-state grammar and admin lab. It deals a seeded run, evolves lineages, and reports what happened. It is backend and CLI only. There is no browser and no UI.

Random seeds are the balance lab. The seed `tutorial` is a fixed lesson, not a shuffled deal.

## L01 rules lock

- Minors in play are Ace through 6, in Air, Fire, Water, and Earth.
- Ranks 7, 8, and 9 exist in the card database and stay out of the L01 deal.
- Tens do not exist.
- Majors exist in the catalog and are disabled in the deal.
- Two players. P1 starts with the Fire Ace. P2 starts with the Water Ace. Those aces are removed from the deal pool.
- Each player receives two hand cards.
- The default run is 4 turns: P1, P2, P1, P2. Turn count is configurable, including 6 and 9.
- The round table has three slots, filled at setup. The rightmost slot has no Parallel Dimension behavior in L01.
- Lineage is a stack of cards. There is no separate rank field. The top card is the current lineage.
- A legal evolution offers a higher rank, passes `alignmentRule`, and stays within `maxJump`.
- `alignmentRule` is `sameColor` or `sameElement`. Default is `sameColor`.
- `maxJump` is `1` or `2`. Default is `2`.
- Black is Air and Fire. Red is Water and Earth. Same color includes same element.
- The encounter and the hand use the same legality check.
- The default bot takes the active encounter when it is legal, then the next legal hand card, and repeats until no legal card remains.
- `maxEvolutionsPerTurn` limits that chain. `unlimited` is the default. `1` is the quieter game.
- An unused encounter moves to the altar at the next turn start.
- The altar holds 3 minors and one reserved empty major slot. A fourth minor sends the oldest minor to the veil.
- The veil is ordered history.
- An empty deck leaves unfilled slots empty and records `DECK EXHAUSTED`.
- The same seed and config produce the same structured events.

Taking `3 AIR` onto `A FIRE` pushes `3 AIR` onto the stack. The Ace stays underneath. The top element is Air.

## Commands

From `L01MASTER`:

```bash
npm install
npm run l01 -- --seed 42
npm run l01 -- --seed tutorial
npm run l01 -- --seed 42 --turns 6
npm run l01:batch -- --runs 1000 --seed-start 1 --turns 4
npm run l01:compare -- --runs 1000 --seed-start 1 --turns 4
npm run l01:tune -- --runs 1000 --seed-start 1 --turns 4,6,9
npm test
npm run check
```

`npm run check` is the TypeScript check plus the test suite.

`--seed tutorial` ignores shuffle. P1 goes Fire Ace, `3 AIR`, `4 FIRE`, `6 AIR`. P2 finishes on `6 WATER`.

## CLI options

- `--seed` — one run. `tutorial` is the scripted lesson. Any other string is a shuffle seed.
- `--runs` — how many games in batch, compare, or tune.
- `--seed-start` — first numeric seed. Runs use `seed-start`, `seed-start + 1`, and so on.
- `--turns` — turn count for a run, batch, or compare. For tune, a comma list such as `4,6,9`.
- `--alignment sameColor|sameElement`
- `--max-jump 1|2`
- `--max-evolutions-per-turn` — `unlimited` or a non-negative integer.

Compare always runs these four presets on one seed list: `sameColor/+2`, `sameColor/+1`, `sameElement/+2`, `sameElement/+1`. Tune runs those four at each listed turn length.

## Metrics

The human log and every statistic are derived from structured events. The engine does not keep a second set of counters.

A single run reports:

- final top rank, and whether that rank is 6
- total evolutions, and evolutions per player
- cards taken from the hand
- cards taken from the encounter
- unused encounters sent to the altar
- altar overflows
- veil count
- final deck count

A batch, compare, or tune also reports:

- rank 6 rate for P1, P2, and both players
- rank distribution: the share ending on Ace, 2, 3, 4, 5, and 6, per player and overall
- average final rank
- average evolutions
- average altar sends, overflows, and veil count

## Known baseline

Configuration: `sameColor/+2`, 4 turns, seeds 1 through 1000.

- Rank 6 rate: 5.1% of players (P1 5.3%, P2 4.8%).
- Overall endings: Ace 39.6%, 2 17.8%, 3 17.8%, 4 10.8%, 5 9.0%, 6 5.1%.
- Average final rank: 2.47.

This shuffled result is the balance lab. It is not a target and it is not the lesson. Seed `tutorial` is the satisfaction run.

## Baseline marker

- L01 baseline commit before this lockdown: `02967b7`
- The lockdown commit is the commit with message `docs: lock L01 baseline`.

See [docs/L01_RULES_LOCK.md](docs/L01_RULES_LOCK.md) and [docs/BASELINE.md](docs/BASELINE.md).

## L02

L02 is the first real playable layer. Later games start from here: evolve a lineage, collect cards into hand, clear the round table onto the altar, and spend Water or Air to touch the veil.

L01 is unchanged. L02 is a separate CLI mode.

```bash
npm run l02 -- --seed 42
npm run l02 -- --seed 42 --turns 6
npm run l02:batch -- --runs 1000 --seed-start 1 --turns 6
npm run l02:compare -- --runs 1000 --seed-start 1 --turns 6
```

Defaults: 6 turns, same color, jump 2, two starting cards, unlimited hand, altar capacity 3, oldest overflow, Water resurface and Air swap on, one elemental effect per turn.

Each turn fills empty slots, collects the leftmost table card, evolves from the hand, optionally spends one veil effect, then sends every uncollected table card to the altar. The full lock is in [docs/L02_RULES_LOCK.md](docs/L02_RULES_LOCK.md).

## Development boundaries

L01 is frozen as the card-state grammar. L02 is the layer later play starts from. Eclipse, dice, barriers, combat, health, and majors in play are not part of L02, and they must not be backfilled into L01 unless they are deliberately versioned.
