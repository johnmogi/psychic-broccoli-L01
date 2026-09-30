import type { MetricItem } from "../../../src/z01/inspect.js";

export function MetricsPanel(items: readonly MetricItem[]): HTMLElement {
  const el = document.createElement("section");
  el.className = "metrics";
  el.dataset.component = "MetricsPanel";

  const head = document.createElement("h2");
  head.textContent = "Metrics";
  const list = document.createElement("dl");
  for (const item of items) {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    label.textContent = item.label;
    const value = document.createElement("dd");
    value.textContent = item.value;
    row.append(label, value);
    list.append(row);
  }
  el.append(head, list);
  return el;
}
