import { playGame } from "../../src/engine.js";
import { playL02 } from "../../src/l02/engine.js";
import { playL03 } from "../../src/l03/engine.js";
import { l03MetricsFromEvents } from "../../src/l03/metrics.js";
import { compareL03, runL03Batch } from "../../src/l03/compare.js";
import { metricsFromEvents, percent } from "../../src/metrics.js";
import { l02MetricsFromEvents } from "../../src/l02/metrics.js";
import { captureFrames } from "../../src/z01/capture.js";
import { consoleFrom, inspectBoard, metricItems, type ConsoleEntry, type MetricItem } from "../../src/z01/inspect.js";
import { requestFromValues, settingSpecs } from "../../src/z01/settings.js";
import { buildTimeline, moveTimeline, type Timeline } from "../../src/z01/timeline.js";
import { routeCommand, scrollbackText } from "../../src/z01/commands.js";
import { compareSpread, diagnose, diagnosticSummary, signalsFromL02 } from "../../src/z01/diagnostics.js";
import { batchRows, labBatch, labCompare, type LabSettings } from "../../src/z01/lab.js";
import { presentBatch, presentCompare } from "../../src/z01/present.js";
import { seedList } from "../../src/rng.js";
import { DEFAULT_LAYER, LAYER_COPY, roundTableHint } from "../../src/z01/layers.js";
import { EventConsole } from "./views/console.js";
import { MetricsPanel } from "./views/metrics.js";
import { PlayerPanel } from "./views/player.js";
import { SettingsPanel } from "./views/settings.js";
import { renderLab, StatsPanel } from "./views/stats.js";
import { TimelineBar } from "./views/timeline.js";
import { ZoneView } from "./views/zone.js";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app");

let layer: "L01" | "L02" | "L03" = DEFAULT_LAYER;

const shell = document.createElement("div");
shell.className = "shell";
shell.dataset.workspace = "board";
const tabs = document.createElement("nav");
tabs.className = "workspace-tabs";
const workspaceStatus = document.createElement("p");
workspaceStatus.className = "workspace-status";
for (const name of ["board", "lab", "terminal"] as const) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.workspace = name;
  button.textContent = name === "board" ? "Board" : name === "lab" ? "Lab" : "Terminal";
  button.addEventListener("click", () => setWorkspace(name));
  tabs.append(button);
}
tabs.append(workspaceStatus);
const rail = document.createElement("aside");
rail.className = "rail";
const stage = document.createElement("main");
stage.className = "stage";
const timelineHost = document.createElement("div");
timelineHost.className = "timeline-sticky";
const boardHost = document.createElement("div");
boardHost.className = "board-scroll";
stage.append(timelineHost, boardHost);
const labView = document.createElement("section");
labView.className = "lab-view";
const dock = document.createElement("footer");
dock.className = "dock";
shell.append(tabs, rail, stage, labView, dock);
app.append(shell);

const layerSwitch = document.createElement("div");
layerSwitch.className = "layer-switch";
layerSwitch.dataset.component = "LayerSwitch";
for (const name of ["L02", "L03", "L01"] as const) {
  const button = document.createElement("button");
  button.type = "button";
  const code = document.createElement("span");
  code.className = "layer-code";
  code.textContent = LAYER_COPY[name].code;
  const title = document.createElement("span");
  title.className = "layer-name";
  title.textContent = LAYER_COPY[name].name;
  button.append(code, title);
  button.dataset.layer = name;
  button.addEventListener("click", () => {
    layer = name;
    mountSettings();
  });
  layerSwitch.append(button);
}
rail.append(layerSwitch);

const rules = document.createElement("p");
rules.className = "layer-rules";
rail.append(rules);

const settingsHost = document.createElement("div");
rail.append(settingsHost);

const status = document.createElement("p");
status.className = "status";
rail.append(status);

const labHost = document.createElement("div");
labView.append(labHost);
labHost.append(StatsPanel((settings) => schedule(() => executeBatch(settings)), (settings) => schedule(() => executeCompare(settings))));
setWorkspace("board");

let timeline: Timeline | null = null;
let index = 0;
let metrics: MetricItem[] = [];
let entries: ConsoleEntry[] = [];
let notes: ConsoleEntry[] = [];
let runEvents: unknown[] = [];

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
  rules.textContent = LAYER_COPY[layer].rules;
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
    } else if (request.layer === "L03") {
      const captured = captureFrames(() => playL03(request.seed, request.l03));
      const metrics = l03MetricsFromEvents(captured.result.events, captured.result.pd ? 1 : 0, captured.result.altar.major?.name ?? "");
      show(request.layer, captured.result.seed, captured.result.events, captured.frames, metricItems(metrics));
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
      channel: "system",
      eventType: "ERROR",
      text: message,
      event: { type: "ERROR", message },
      selectable: false,
    }], consoleHandlers()));
  }
}

function show(
  layerName: "L01" | "L02" | "L03",
  seed: string,
  events: readonly { type: string }[],
  frames: Timeline["frames"][number]["board"][],
  nextMetrics: MetricItem[],
): void {
  timeline = buildTimeline(layerName, seed, events, frames);
  index = Math.max(0, timeline.frames.length - 1);
  metrics = nextMetrics;
  entries = consoleFrom(events);
  runEvents = [...events];
  renderFrame();
}

function renderFrame(): void {
  if (!timeline) return;
  const frame = timeline.frames[index];
  if (!frame) return;
  const view = inspectBoard(timeline.layer, frame.board, frame.highlight);
  const hint = roundTableHint(frame.eventType);
  const table = view.zones.find((zone) => zone.id === "round-table");
  if (table && hint) table.hint = hint;
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
  banner.textContent = `${LAYER_COPY[timeline.layer].code} · seed ${timeline.seed}`;
  const kept = boardHost.scrollTop;
  timelineHost.replaceChildren(TimelineBar(frame, timeline.frames.length, timeline.turnCount, (action) => {
    if (!timeline) return;
    index = moveTimeline(index, timeline.frames.length, action);
    renderFrame();
  }));
  board.append(banner, players, zones, MetricsPanel(metrics, frame.highlight.zones.includes("metrics")));
  boardHost.replaceChildren(board);
  boardHost.scrollTop = kept;
  paintTerminal(false);
}

function visibleEntries(): ConsoleEntry[] {
  return [...entries, ...notes];
}

function paintTerminal(refocus: boolean): void {
  const listScroll = dock.querySelector<HTMLElement>(".scrollback")?.scrollTop ?? 0;
  dock.replaceChildren(EventConsole(visibleEntries(), consoleHandlers()));
  const list = dock.querySelector<HTMLElement>(".scrollback");
  const row = list?.querySelector<HTMLElement>("[data-selected='true']");
  if (list) list.scrollTop = listScroll;
  if (shell.dataset.workspace === "terminal" && list && row) {
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < listRect.top) list.scrollTop -= listRect.top - rowRect.top;
    else if (rowRect.bottom > listRect.bottom) list.scrollTop += rowRect.bottom - listRect.bottom;
  }
  if (refocus) dock.querySelector<HTMLInputElement>(".terminal-input")?.focus();
}

function consoleHandlers() {
  return {
    selectedIndex: index,
    onSelect: (next: number) => {
      index = next;
      renderFrame();
    },
    onCommand: (text: string) => {
      const routed = routeCommand(text);
      if (routed.action === "unknown" || routed.action === "help") addNote("system", routed.action === "help" ? "HELP" : "UNKNOWN", routed.line);
      else if (routed.action === "clear") {
        notes = [];
        addNote("system", "CLEAR", "Command output cleared.");
      } else if (routed.action === "run") run(readRunForm());
      else if (routed.action === "batch") schedule(() => executeBatch(readLabForm()));
      else if (routed.action === "compare") schedule(() => executeCompare(readLabForm()));
      else if (routed.action === "copy-logs") void copyText(scrollbackText(visibleEntries()), "logs");
      else if (routed.action === "copy-events") void copyText(JSON.stringify(runEvents, null, 2), "events");
      if (routed.action !== "run") paintTerminal(true);
    },
    onCopyLogs: () => void copyText(scrollbackText(visibleEntries()), "logs"),
    onCopyEvents: () => void copyText(JSON.stringify(runEvents, null, 2), "events"),
  };
}

function addNote(channel: "system" | "stats", eventType: string, text: string): void {
  notes.push({
    index: entries.length + notes.length,
    role: "log",
    channel,
    eventType,
    text,
    event: { type: eventType, text },
    selectable: false,
  });
  if (timeline) paintTerminal(channel === "system");
}

function executeBatch(settings: LabSettings): void {
  if (layer === "L03") {
    const stats = runL03Batch({
      seeds: seedList(settings.seedStart, settings.runs),
      config: {
        turnCount: settings.turns,
        alignmentRule: settings.alignmentRule,
        maxJump: settings.maxJump,
        waterResurfaceEnabled: settings.water,
        airSwapEnabled: settings.air,
      },
    });
    const lines = diagnosticSummary(diagnose(signalsFromL02(stats)));
    renderLab(labHost, presentBatch(stats, {
      eclipseRate: stats.eclipseRate,
      triangulationRate: stats.triangulationRate,
      majorSeenRate: stats.majorSeenRate,
      majorCongestion: stats.majorCongestion,
    }));
    addNote("stats", "BATCH", `eclipse ${percent(stats.eclipseRate)} triangulation ${percent(stats.triangulationRate)} majors ${percent(stats.majorSeenRate)} field ${stats.majorCongestion.toFixed(2)}`);
    for (const line of lines) addNote("stats", "DIAG", line);
    setWorkspace("lab");
    status.textContent = "";
    workspaceStatus.textContent = "";
    return;
  }
  if (layer !== "L02") {
    addNote("system", "BATCH", "Stats lab runs on Z02 / L02.");
    return;
  }
  const stats = labBatch(settings);
  const lines = diagnosticSummary(diagnose(signalsFromL02(stats)));
  renderLab(labHost, presentBatch(stats));
  addNote("stats", "BATCH", batchRows(stats).map((row) => `${row.label} ${row.value}`).join(" · "));
  for (const line of lines) addNote("stats", "DIAG", line);
  setWorkspace("lab");
  status.textContent = "";
  workspaceStatus.textContent = "";
}

function executeCompare(settings: Pick<LabSettings, "runs" | "seedStart" | "turns">): void {
  if (layer === "L03") {
    const compared = compareL03({ runs: settings.runs, seedStart: settings.seedStart, turnCount: settings.turns });
    const view = presentCompare(compared.rows);
    compared.rows.forEach((row, index) => {
      view.compare[index]?.cells.push(
        { id: "eclipseRate", label: "Eclipse", value: percent(row.eclipseRate), fraction: row.eclipseRate },
        { id: "triangulationRate", label: "Triangulation", value: percent(row.triangulationRate), fraction: row.triangulationRate },
        { id: "majorCongestion", label: "Field", value: row.majorCongestion.toFixed(2), fraction: null },
      );
    });
    renderLab(labHost, view);
    for (const row of compared.rows) {
      addNote("stats", "COMPARE", `${row.name} eclipse ${percent(row.eclipseRate)} triangulation ${percent(row.triangulationRate)} field ${row.majorCongestion.toFixed(2)}`);
    }
    setWorkspace("lab");
    status.textContent = "";
    workspaceStatus.textContent = "";
    return;
  }
  if (layer !== "L02") {
    addNote("system", "COMPARE", "Stats lab runs on Z02 / L02.");
    return;
  }
  const compared = labCompare(settings);
  const spread = compareSpread(compared.rows.map((row) => ({ name: row.name, signals: signalsFromL02(row) })));
  renderLab(labHost, presentCompare(compared.rows));
  for (const row of compared.rows) {
    addNote("stats", "COMPARE", `${row.name} rank6 ${batchRows(row).find((item) => item.label === "Rank 6")?.value} avg ${row.averageFinalRank.toFixed(2)} water ${row.averageWater.toFixed(2)} air ${row.averageAir.toFixed(2)} veil ${row.averageVeil.toFixed(2)}`);
  }
  for (const item of spread.extremes) {
    addNote("stats", "DIAG", `${item.label}: best ${item.bestName} ${item.bestValue}, worst ${item.worstName} ${item.worstValue}.`);
  }
  for (const line of spread.problemLines) addNote("stats", "DIAG", line);
  setWorkspace("lab");
  status.textContent = "";
  workspaceStatus.textContent = "";
}

function schedule(work: () => void): void {
  status.textContent = "Running…";
  workspaceStatus.textContent = "Running…";
  window.setTimeout(() => {
    try {
      work();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = message;
      workspaceStatus.textContent = message;
    }
  }, 0);
}

function setWorkspace(next: "board" | "lab" | "terminal"): void {
  shell.dataset.workspace = next;
  for (const button of tabs.querySelectorAll("button")) {
    button.dataset.selected = button.dataset.workspace === next ? "true" : "false";
  }
  if (next === "terminal") paintTerminal(false);
}

function readRunForm(): Record<string, string> {
  return readNamed(settingsHost);
}

function readLabForm(): LabSettings {
  const values = readNamed(labHost);
  return {
    runs: Number(values["runs"]),
    seedStart: Number(values["seedStart"]),
    turns: Number(values["turns"]),
    alignmentRule: values["alignmentRule"] === "sameElement" ? "sameElement" : "sameColor",
    maxJump: values["maxJump"] === "1" ? 1 : 2,
    water: values["water"] !== "false",
    air: values["air"] !== "false",
  };
}

function readNamed(root: ParentNode): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")) {
    if (!field.name) continue;
    values[field.name] = field instanceof HTMLInputElement && field.type === "checkbox" ? String(field.checked) : field.value;
  }
  return values;
}

async function copyText(text: string, kind: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    addNote("system", "COPY", `Copied ${kind}.`);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}
