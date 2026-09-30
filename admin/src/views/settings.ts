import type { SettingSpec } from "../../../src/z01/settings.js";

export function SettingsPanel(
  specs: readonly SettingSpec[],
  onRun: (values: Record<string, string>) => void,
): HTMLElement {
  const el = document.createElement("form");
  el.className = "settings";
  el.dataset.component = "SettingsPanel";

  const head = document.createElement("h2");
  head.textContent = "Run";
  el.append(head);

  const fields = document.createElement("div");
  fields.className = "settings-fields";
  for (const spec of specs) fields.append(field(spec));
  el.append(fields);

  const run = document.createElement("button");
  run.type = "submit";
  run.textContent = "Run engine";
  el.append(run);

  el.addEventListener("submit", (event) => {
    event.preventDefault();
    const values: Record<string, string> = {};
    for (const spec of specs) {
      const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${spec.id}"]`);
      if (!input) continue;
      values[spec.id] = input instanceof HTMLInputElement && input.type === "checkbox"
        ? String(input.checked)
        : input.value;
    }
    onRun(values);
  });

  return el;
}

function field(spec: SettingSpec): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "setting";
  wrap.dataset.setting = spec.id;

  const name = document.createElement("span");
  name.textContent = spec.label;
  wrap.append(name);

  if (spec.control === "select") {
    const select = document.createElement("select");
    select.name = spec.id;
    for (const option of spec.options ?? []) {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === spec.value;
      select.append(item);
    }
    wrap.append(select);
  } else if (spec.control === "checkbox") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = spec.id;
    input.checked = spec.value === "true";
    wrap.append(input);
  } else {
    const input = document.createElement("input");
    input.type = spec.control === "number" ? "number" : "text";
    input.name = spec.id;
    input.value = spec.value;
    if (spec.control === "number") input.min = "1";
    wrap.append(input);
  }

  if (spec.note) {
    const note = document.createElement("small");
    note.textContent = spec.note;
    wrap.append(note);
  }
  return wrap;
}
