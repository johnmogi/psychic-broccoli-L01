# L03 rules lock

L03 is the majors, Parallel Dimension, Eclipse, and Triangulation layer. It starts from the L02 collect, altar, and Veil loop. It does not add the event die, barriers, challenges, combat, health, the negotiation bowl, or royal effects. Those stay Z04 or later.

Minors in the deal are still Ace through 6. Ranks 7–9 stay in the catalog and out of the deal. There are no tens.

## Major catalog

The default major deck is the full catalog: Prince, Queen, and King, times Air, Fire, Water, and Earth, times Sun and Moon backs. That is 24 majors. A scripted deck may place specific majors at the front, then the remaining minors, then the rest of the catalog. It does not drop majors.

## Routing

After the table refills, majors on the Round Table are routed before anyone collects.

- One major, and PD is empty, moves to PD. It is not collected into a hand. It surfaces on a later turn when no new major appears.
- If PD already holds a major and another major appears, the PD major surfaces immediately. Both resolve in the same altar window, including Eclipse and Triangulation.
- Two or more majors in the same routing window go to that altar window. An occupied PD is included.

PD holds one major. Water and Air effects only move minors. They do not pull a major out of PD, the altar major slot, or the Veil top.

## Eclipse

`eclipseMode` defaults to `sameRankOppositeBack`. Same court, opposite back. Element does not matter. Sun Queen and Moon Queen eclipse. Same back, or different court, does not. Only this mode is implemented.

On Eclipse the older major moves to the Veil, the incoming major stays in the one altar-major slot, and the active player receives a Joker. The event is `ECLIPSE` plus `JOKER_AWARDED`.

## Triangulation

`triangulationMode` defaults to `sameRankMajorSet`, and triangulation is enabled. The combined field is the majors visible on the Round Table before routing, plus the PD major, plus the altar major, including majors in the current altar resolution window. Three majors of the same rank in that field emit `TRIANGULATION` once per trigger, not on every later snapshot, and record a team milestone. Element and back do not matter. `anyThreeMajors` is the experimental mode that still fires on any three majors. Turn triangulation off with `triangulationEnabled: false`.

## Altar major capacity

`altarMajorCapacity` is 1. `majorOverflowMode` defaults to `newestStays`. If a new major arrives and there is no Eclipse, the newest major stays and the older major goes to the Veil (`MAJOR_TO_VEIL` reason `replaced`, plus `MAJOR_REPLACED`).

`majorOverflowMode: "activeChoice"` throws. A stronger lineage choosing which major stays is a later hook, not L03. `highLevelMajorChoice: true` also throws.

## Metrics

Counts come from the structured events: majors seen, PD sends, PD surfaces, replacements, eclipses, triangulations, Jokers, and the max combined-field size recorded on `MAJOR_FIELD` / `COMPLETE`. Batch rates are the share of runs with at least one Eclipse or Triangulation, unique majors seen divided by 24, and the average peak field size.
