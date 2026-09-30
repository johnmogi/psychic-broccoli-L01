# Z01 admin shell

Z01 is an inspection and control shell over the L01 and L02 engines. It does not own rules. A run calls `playGame` or `playL02`, then projects the returned state and structured events into view models.

Later play still starts from L02. L01 remains the frozen grammar and is only available here as a lab view.

The layout is a list of zones and a list of settings. Z02, Z03, and Z04 can add zones or settings without a new page structure. The bottom pane is an event scrollback with a channel on every line (`admin`, later `advice` or `story`). It has no command input and no parser.

```bash
npm run z01
```

Open the printed local URL. The default view is an L02 run with seed `42`.
