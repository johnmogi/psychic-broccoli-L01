import type { LabSettings } from "../../../src/z01/lab.js";

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

  const results = document.createElement("div");
  results.className = "stats-results";
  results.dataset.role = "lab-results";
  const diagnostics = document.createElement("div");
  diagnostics.className = "diagnostics";
  diagnostics.dataset.role = "lab-diagnostics";

  batch.addEventListener("click", () => onBatch(readLab(form)));
  compare.addEventListener("click", () => {
    const settings = readLab(form);
    onCompare({ runs: settings.runs, seedStart: settings.seedStart, turns: settings.turns });
  });

  el.append(head, note, form, actions, results, diagnostics);
  return el;
}

export function fillLabResults(root: ParentNode, title: string, rows: { label: string; value: string }[][]): void {
  const host = root.querySelector<HTMLElement>("[data-role='lab-results']");
  if (!host) return;
  host.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = title;
  host.append(heading);
  for (const group of rows) {
    const list = document.createElement("dl");
    for (const row of group) {
      const label = document.createElement("dt");
      label.textContent = row.label;
      const value = document.createElement("dd");
      value.textContent = row.value;
      const line = document.createElement("div");
      line.append(label, value);
      list.append(line);
    }
    host.append(list);
  }
}

export function fillDiagnostics(
  root: ParentNode,
  model: {
    chips: { status: "healthy" | "watch" | "problem"; text: string }[];
    lines: string[];
    extremes: { label: string; best: string; worst: string }[];
    problems: string[];
  },
): void {
  const host = root.querySelector<HTMLElement>("[data-role='lab-diagnostics']");
  if (!host) return;
  host.replaceChildren();
  if (model.chips.length) {
    const list = document.createElement("ul");
    list.className = "diag-list";
    for (const chip of model.chips) {
      const item = document.createElement("li");
      item.className = `diag-chip is-${chip.status}`;
      item.textContent = chip.text;
      list.append(item);
    }
    host.append(list);
  }
  if (model.lines.length) host.append(lineList(model.lines));
  if (model.extremes.length) {
    const heading = document.createElement("h3");
    heading.textContent = "Best / worst";
    const list = document.createElement("ul");
    list.className = "diag-lines";
    for (const item of model.extremes) {
      const line = document.createElement("li");
      line.textContent = `${item.label}: best ${item.best}, worst ${item.worst}`;
      list.append(line);
    }
    host.append(heading, list);
  }
  if (model.problems.length) {
    const heading = document.createElement("h3");
    heading.textContent = "Problem configs";
    host.append(heading, lineList(model.problems, "is-problem"));
  }
}

function lineList(lines: string[], extra = ""): HTMLUListElement {
  const list = document.createElement("ul");
  list.className = extra ? `diag-lines ${extra}` : "diag-lines";
  for (const line of lines) {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  }
  return list;
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
