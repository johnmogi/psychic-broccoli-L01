# Z01 admin shell

Z01 is an inspection and control shell over the L01 and L02 engines. It does not own rules. A run calls `playGame` or `playL02`, then projects the returned state and structured events into view models.

Later play still starts from L02. L01 remains the frozen grammar and is only available here as a lab view.

The layout is a list of zones and a list of settings. Z02, Z03, and Z04 can add zones or settings without a new page structure. The bottom pane is an event scrollback with a channel on every line (`admin`, later `advice` or `story`). It has no command input and no parser.

Timeline replay steps through one engine snapshot per event. Start shows the setup board. End shows the finished board. The selected event highlights the cards and zones named in its payload, marks that row in the terminal, and fills the “What changed” line from the same event. Click a terminal row to jump there. This is God-mode inspection for turn flow and later tutorial or player-view planning. It is not a player UI. Metrics stay the finished run and light up on the COMPLETE event, because those stats are defined on a completed log.

```bash
npm run z01
```

Open the printed local URL. The default view is an L02 run with seed `42`.
