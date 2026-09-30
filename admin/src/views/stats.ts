import type { LabSettings } from "../../../src/z01/lab.js";
import type { LabPresentation } from "../../../src/z01/present.js";

export function StatsPanel(
  onBatch: (settings: LabSettings) => void,
  onCompare: (settings: Pick<LabSettings, "runs" | "seedStart" | "turns">) => void,
): HTMLElement {
  const el = document.createElement("section");
  el.className = "stats-lab";
  el.dataset.component = "StatsPanel";

  const head = document.createElement("h2");
  head.textContent = "Stats lab";
  const note = document.createElement("p");
  note.className = "zone-hint";
  note.textContent = "Z02 batch and the four alignment presets. Diagnostics use first-pass lab targets.";

  const form = document.createElement("form");
  form.className = "settings-fields";
  form.append(
    numberField("runs", "Runs", "20"),
    numberField("seedStart", "Seed start", "1"),
    numberField("turns", "Turns", "6"),
    selectField("alignmentRule", "Alignment", ["sameColor", "sameElement"]),
    selectField("maxJump", "Max jump", ["2", "1"]),
    checkField("water", "Water resurface", true),
    checkField("air", "Air swap", true),
  );

  const batch = document.createElement("button");
  batch.type = "button";
  batch.textContent = "Run batch";
  const compare = document.createElement("button");
  compare.type = "button";
  compare.textContent = "Run four-way compare";
  const actions = document.createElement("div");
  actions.className = "stats-actions";
  actions.append(batch, compare);

  const board = document.createElement("div");
  board.className = "lab-board";
  board.dataset.role = "lab-board";
  const empty = document.createElement("p");
  empty.className = "zone-hint";
  empty.textContent = "Run a batch or a four-way compare. Diagnostics, rank bars, and the compare table land here.";
  board.append(empty);

  batch.addEventListener("click", () => onBatch(readLab(form)));
  compare.addEventListener("click", () => {
    const settings = readLab(form);
    onCompare({ runs: settings.runs, seedStart: settings.seedStart, turns: settings.turns });
  });

  el.append(head, note, form, actions, board);
  return el;
}

export function renderLab(root: ParentNode, model: LabPresentation): void {
  const host = root.querySelector<HTMLElement>("[data-role='lab-board']");
  if (!host) return;
  host.replaceChildren();
  if (model.findings.length) host.append(findingList(model.findings));
  if (model.meters.length) host.append(meterGrid("Summary", model.meters));
  if (model.ranks.length) host.append(rankSection(model.ranks));
  if (model.pressure.length) host.append(pressureSection(model.pressure));
  if (model.compare.length) host.append(compareTable(model.compare));
  if (model.slots.length) host.append(meterGrid("Open slots", model.slots));
}

function findingList(lines: LabPresentation["findings"]): HTMLElement {
  const section = document.createElement("section");
  section.className = "lab-findings";
  const heading = document.createElement("h3");
  heading.textContent = "Diagnostics";
  const list = document.createElement("ul");
  for (const line of lines) {
    const item = document.createElement("li");
    item.className = `diag-line is-${line.status}`;
    item.textContent = line.text;
    list.append(item);
  }
  section.append(heading, list);
  return section;
}

function meterGrid(title: string, meters: LabPresentation["meters"]): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = title;
  const grid = document.createElement("div");
  grid.className = "lab-meters";
  for (const meter of meters) {
    const card = document.createElement("div");
    card.className = "lab-meter";
    const label = document.createElement("span");
    label.textContent = meter.label;
    const value = document.createElement("strong");
    value.textContent = meter.value;
    card.append(label, value);
    if (meter.fraction !== null) card.append(bar(meter.fraction));
    grid.append(card);
  }
  section.append(heading, grid);
  return section;
}

function rankSection(charts: LabPresentation["ranks"]): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "Rank distribution";
  const grid = document.createElement("div");
  grid.className = "rank-charts";
  for (const chart of charts) {
    const block = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = chart.seat;
    block.append(title);
    for (const rank of chart.bars) {
      const row = document.createElement("div");
      row.className = "rank-row";
      const label = document.createElement("span");
      label.textContent = rank.label;
      const value = document.createElement("span");
      value.textContent = rank.value;
      row.append(label, bar(rank.fraction), value);
      block.append(row);
    }
    grid.append(block);
  }
  section.append(heading, grid);
  return section;
}

function pressureSection(rows: LabPresentation["pressure"]): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "Pressure";
  const list = document.createElement("div");
  list.className = "pressure-rows";
  for (const row of rows) {
    const line = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    line.append(label, value);
    list.append(line);
  }
  section.append(heading, list);
  return section;
}

function compareTable(rows: LabPresentation["compare"]): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "Four-way compare";
  const table = document.createElement("table");
  table.className = "lab-table";
  const head = document.createElement("tr");
  const headers = ["Config", ...(rows[0]?.cells.map((cell) => cell.label) ?? []), "Status"];
  for (const label of headers) {
    const cell = document.createElement("th");
    cell.textContent = label;
    head.append(cell);
  }
  table.append(head);
  for (const row of rows) {
    const line = document.createElement("tr");
    if (row.best) line.dataset.best = "true";
    if (row.problem) line.dataset.problem = "true";
    const name = document.createElement("td");
    name.textContent = row.best ? `${row.name} · best` : row.name;
    line.append(name);
    for (const cell of row.cells) {
      const item = document.createElement("td");
      item.textContent = cell.value;
      if (cell.fraction !== null) item.append(bar(cell.fraction));
      line.append(item);
    }
    const status = document.createElement("td");
    status.className = `is-${row.status}`;
    status.textContent = row.status;
    line.append(status);
    table.append(line);
  }
  section.append(heading, table);
  return section;
}

function bar(fraction: number): HTMLElement {
  const track = document.createElement("span");
  track.className = "lab-bar";
  const fill = document.createElement("span");
  const clamped = Math.max(0, Math.min(1, fraction));
  fill.style.width = `${(clamped * 100).toFixed(1)}%`;
  track.append(fill);
  return track;
}

function readLab(form: HTMLFormElement): LabSettings {
  const value = (name: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  const alignment = value("alignmentRule")?.value === "sameElement" ? "sameElement" : "sameColor";
  const jump = value("maxJump")?.value === "1" ? 1 : 2;
  const water = form.querySelector<HTMLInputElement>("[name='water']");
  const air = form.querySelector<HTMLInputElement>("[name='air']");
  return {
    runs: Number(value("runs")?.value),
    seedStart: Number(value("seedStart")?.value),
    turns: Number(value("turns")?.value),
    alignmentRule: alignment,
    maxJump: jump,
    water: water?.checked ?? true,
    air: air?.checked ?? true,
  };
}

function numberField(name: string, label: string, initial: string): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "setting";
  const title = document.createElement("span");
  title.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.value = initial;
  input.min = name === "seedStart" ? "0" : "1";
  wrap.append(title, input);
  return wrap;
}

function selectField(name: string, label: string, options: string[]): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "setting";
  const title = document.createElement("span");
  title.textContent = label;
  const select = document.createElement("select");
  select.name = name;
  for (const option of options) {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    select.append(item);
  }
  wrap.append(title, select);
  return wrap;
}

function checkField(name: string, label: string, checked: boolean): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "setting";
  const title = document.createElement("span");
  title.textContent = label;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.checked = checked;
  wrap.append(title, input);
  return wrap;
}
