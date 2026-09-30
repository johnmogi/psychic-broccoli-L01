import { playGame } from "../../src/engine.js";
import { playL02 } from "../../src/l02/engine.js";
import { metricsFromEvents } from "../../src/metrics.js";
import { l02MetricsFromEvents } from "../../src/l02/metrics.js";
import { captureFrames } from "../../src/z01/capture.js";
import { consoleFrom, inspectBoard, metricItems, type ConsoleEntry, type MetricItem } from "../../src/z01/inspect.js";
import { requestFromValues, settingSpecs } from "../../src/z01/settings.js";
import { buildTimeline, moveTimeline, type Timeline } from "../../src/z01/timeline.js";
import { EventConsole } from "./views/console.js";
import { MetricsPanel } from "./views/metrics.js";
import { PlayerPanel } from "./views/player.js";
import { SettingsPanel } from "./views/settings.js";
import { TimelineBar } from "./views/timeline.js";
import { ZoneView } from "./views/zone.js";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app");

let layer: "L01" | "L02" = "L02";

const shell = document.createElement("div");
shell.className = "shell";
const rail = document.createElement("aside");
rail.className = "rail";
const stage = document.createElement("main");
stage.className = "stage";
const dock = document.createElement("footer");
dock.className = "dock";
shell.append(rail, stage, dock);
app.append(shell);

const layerSwitch = document.createElement("div");
layerSwitch.className = "layer-switch";
layerSwitch.dataset.component = "LayerSwitch";
for (const name of ["L01", "L02"] as const) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = name;
  button.dataset.layer = name;
  button.addEventListener("click", () => {
    layer = name;
    mountSettings();
  });
  layerSwitch.append(button);
}
rail.append(layerSwitch);

const settingsHost = document.createElement("div");
rail.append(settingsHost);

const status = document.createElement("p");
status.className = "status";
rail.append(status);

let timeline: Timeline | null = null;
let index = 0;
let metrics: MetricItem[] = [];
let entries: ConsoleEntry[] = [];

mountSettings();
run({
  seed: "42",
  turnCount: "6",
  alignmentRule: "sameColor",
  maxJump: "2",
  waterResurfaceEnabled: "true",
  airSwapEnabled: "true",
  altarOverflowMode: "oldest",
});

function mountSettings(): void {
  settingsHost.replaceChildren(SettingsPanel(settingSpecs(layer), run));
  for (const button of layerSwitch.querySelectorAll("button")) {
    button.dataset.selected = button.dataset.layer === layer ? "true" : "false";
  }
}

function run(values: Record<string, string>): void {
  const request = requestFromValues(layer, values);
  status.textContent = "";
  try {
    if (request.layer === "L01") {
      const captured = captureFrames(() => playGame(request.seed, request.l01));
      show(request.layer, captured.result.seed, captured.result.events, captured.frames, metricItems(metricsFromEvents(captured.result.events)));
    } else {
      const captured = captureFrames(() => playL02(request.seed, request.l02));
      show(request.layer, captured.result.seed, captured.result.events, captured.frames, metricItems(l02MetricsFromEvents(captured.result.events)));
    }
  } catch (error) {
    timeline = null;
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = message;
    dock.replaceChildren(EventConsole([{
      index: 0,
      role: "log",
      channel: "admin",
      eventType: "ERROR",
      text: message,
      event: { type: "ERROR", message },
    }]));
  }
}

function show(
  layerName: "L01" | "L02",
  seed: string,
  events: readonly { type: string }[],
  frames: Timeline["frames"][number]["board"][],
  nextMetrics: MetricItem[],
): void {
  timeline = buildTimeline(layerName, seed, events, frames);
  index = Math.max(0, timeline.frames.length - 1);
  metrics = nextMetrics;
  entries = consoleFrom(events);
  renderFrame();
}

function renderFrame(): void {
  if (!timeline) return;
  const frame = timeline.frames[index];
  if (!frame) return;
  const view = inspectBoard(timeline.layer, frame.board, frame.highlight);
  const players = document.createElement("div");
  players.className = "players";
  for (const player of view.players) players.append(PlayerPanel(player));

  const zones = document.createElement("div");
  zones.className = "zones";
  for (const zone of view.zones) zones.append(ZoneView(zone));

  const board = document.createElement("div");
  board.className = "board";
  const banner = document.createElement("p");
  banner.className = "banner";
  banner.textContent = `${timeline.layer} · seed ${timeline.seed}`;
  board.append(
    TimelineBar(frame, timeline.frames.length, (action) => {
      if (!timeline) return;
      index = moveTimeline(index, timeline.frames.length, action);
      renderFrame();
    }),
    banner,
    players,
    zones,
    MetricsPanel(metrics, frame.highlight.zones.includes("metrics")),
  );
  stage.replaceChildren(board);
  dock.replaceChildren(EventConsole(entries, index, (next) => {
    index = next;
    renderFrame();
  }));
  const row = dock.querySelector<HTMLElement>("[data-selected='true']");
  row?.scrollIntoView({ block: "nearest" });
}
