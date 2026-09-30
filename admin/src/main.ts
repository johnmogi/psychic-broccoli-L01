import { playGame } from "../../src/engine.js";
import { playL02 } from "../../src/l02/engine.js";
import { inspectL01, inspectL02, type Inspection } from "../../src/z01/inspect.js";
import { requestFromValues, settingSpecs } from "../../src/z01/settings.js";
import { EventConsole } from "./views/console.js";
import { MetricsPanel } from "./views/metrics.js";
import { PlayerPanel } from "./views/player.js";
import { SettingsPanel } from "./views/settings.js";
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
    const view = request.layer === "L01"
      ? inspectL01(playGame(request.seed, request.l01))
      : inspectL02(playL02(request.seed, request.l02));
    render(view);
  } catch (error) {
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

function render(view: Inspection): void {
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
  banner.textContent = `${view.layer} · seed ${view.seed}`;
  board.append(banner, players, zones, MetricsPanel(view.metrics));
  stage.replaceChildren(board);
  dock.replaceChildren(EventConsole(view.console));
  const scroll = dock.querySelector(".scrollback");
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}
