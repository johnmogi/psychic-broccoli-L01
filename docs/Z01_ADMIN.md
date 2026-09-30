# Z01 admin shell

Z01 is an inspection and control shell over the L01 and L02 engines. It does not own rules. A run calls `playGame` or `playL02`, then projects the returned state and structured events into view models.

Later play still starts from L02. L01 remains the frozen grammar and is only available here as a lab view.

The shell has three workspaces: Board, Lab, and Terminal. Board is one run: timeline, zones, players, and metrics. Lab is the wide stats surface for a Z02 batch or four-way compare, with diagnostics first, rank bars, pressure rows, and a compare table. Terminal is the event scrollback. Each line has a channel (`admin`, `stats`, `system`, later `advice` or `story`). The `nexus>` line only forwards a short command list to the same actions as the buttons. `batch` and `compare` update the Lab view and print a summary in the terminal.

Timeline replay steps through one engine snapshot per event. Start shows the setup board. End shows the finished board. The selected event highlights the cards and zones named in its payload, marks that row in the terminal, and fills the “What changed” line from the same event. Click a terminal row to jump there. This is God-mode inspection for turn flow and later tutorial or player-view planning. It is not a player UI. Metrics stay the finished run and light up on the COMPLETE event, because those stats are defined on a completed log.

The shell opens on Z02 / L02. From the page you can replay one run, copy the terminal text or the event JSON, run a Z02 batch, and run the four-way compare. Batch and compare results include a diagnostics reading against first-pass L02 targets (`healthy`, `watch`, `problem`). The timeline position shows both `Turn X / N` and `Event Y / M`. The `nexus>` line accepts `help`, `run`, `batch`, `compare`, `copy logs`, `copy events`, and `clear`. Those words only call the same actions as the buttons.

```bash
npm run z01
```

Open the printed local URL. The shell opens on Z02 / L02, the collection, altar, and veil loop. Z01 / L01 stays available as lineage grammar inspection. The timeline controls stay pinned above the board.
