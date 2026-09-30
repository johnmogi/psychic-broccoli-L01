# L01 baseline

## Commits

- Baseline before lockdown: `02967b7`
- Lockdown commit: the commit with message `docs: lock L01 baseline`

## What was verified for the lockdown

Commands, run from `L01MASTER` after `npm install`:

```bash
npm test
npm run check
npm run l01 -- --seed tutorial
npm run l01:compare -- --runs 1000 --seed-start 1 --turns 4
```

Result at lockdown:

- `npm test`: 8 files, 23 tests, passed
- `npm run check`: typecheck plus the same 23 tests, passed
- `tutorial`: P1 ends on `6 AIR`, P2 ends on `6 WATER`, 6 evolutions
- compare, seeds 1–1000, 4 turns: `sameColor/+2` players at rank 6 is 5.1%

## Shuffled baseline

`sameColor/+2`, 4 turns, seeds 1–1000:

- Overall rank 6 rate: 5.1%
- Overall rank distribution: Ace 39.6%, 2 17.8%, 3 17.8%, 4 10.8%, 5 9.0%, 6 5.1%

## Tutorial baseline

`--seed tutorial` is fixed:

- P1 lineage: Fire Ace, `3 AIR`, `4 FIRE`, `6 AIR`
- P2 top: `6 WATER`

## Boundary

L01 stays the card-state grammar. L02 is not part of this baseline.
