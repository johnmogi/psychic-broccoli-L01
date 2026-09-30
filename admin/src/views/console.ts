import type { ConsoleEntry } from "../../../src/z01/inspect.js";

/**
 * Scrollback pane. Channels stay on each line so a later renderer can show
 * admin log, advisor text, or story prose from the same stream.
 * There is no command input and no parser.
 */
export function EventConsole(
  entries: readonly ConsoleEntry[],
  selectedIndex = -1,
  onSelect?: (index: number) => void,
): HTMLElement {
  const el = document.createElement("section");
  el.className = "terminal";
  el.dataset.component = "EventConsole";
  el.dataset.terminal = "scrollback";

  const head = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = "Terminal";
  const note = document.createElement("span");
  note.textContent = "event scrollback";
  head.append(title, note);

  const list = document.createElement("ol");
  list.className = "scrollback";
  for (const entry of entries) {
    const line = document.createElement("li");
    line.dataset.eventType = entry.eventType;
    line.dataset.channel = entry.channel;
    line.dataset.role = entry.role;
    line.dataset.index = String(entry.index);
    line.tabIndex = 0;
    if (entry.index === selectedIndex) line.dataset.selected = "true";
    const choose = () => onSelect?.(entry.index);
    line.addEventListener("click", choose);
    line.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        keyEvent.preventDefault();
        choose();
      }
    });

    const index = document.createElement("span");
    index.className = "term-index";
    index.textContent = String(entry.index).padStart(3, "0");

    const kind = document.createElement("span");
    kind.className = "term-kind";
    kind.textContent = entry.eventType;

    const text = document.createElement("span");
    text.className = "term-text";
    text.textContent = entry.text;

    line.append(index, kind, text);
    list.append(line);
  }

  const prompt = document.createElement("div");
  prompt.className = "terminal-prompt";
  prompt.dataset.commandParser = "absent";
  const mark = document.createElement("span");
  mark.textContent = "nexus>";
  const hold = document.createElement("span");
  hold.className = "terminal-hold";
  hold.textContent = "scrollback only";
  prompt.append(mark, hold);

  el.append(head, list, prompt);
  return el;
}
