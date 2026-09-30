import { timelinePositionLabel, type TimelineFrame } from "../../../src/z01/timeline.js";

export function TimelineBar(
  frame: TimelineFrame,
  total: number,
  turnCount: number,
  onMove: (action: "start" | "back" | "next" | "end") => void,
): HTMLElement {
  const el = document.createElement("section");
  el.className = "timeline";
  el.dataset.component = "TimelineBar";

  const controls = document.createElement("div");
  controls.className = "timeline-controls";
  for (const [action, label] of [
    ["start", "Start"],
    ["back", "Back"],
    ["next", "Next"],
    ["end", "End"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.addEventListener("click", () => onMove(action));
    controls.append(button);
  }

  const position = document.createElement("p");
  position.className = "timeline-position";
  position.textContent = timelinePositionLabel(frame, total, turnCount);

  const summary = document.createElement("p");
  summary.className = "timeline-summary";
  summary.textContent = frame.summary;

  const changed = document.createElement("p");
  changed.className = "what-changed";
  changed.dataset.component = "WhatChanged";
  const label = document.createElement("span");
  label.textContent = "What changed";
  const text = document.createElement("strong");
  text.textContent = frame.explanation;
  changed.append(label, text);

  el.append(controls, position, summary, changed);
  return el;
}
