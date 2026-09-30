import type { ConsoleEntry } from "../../../src/z01/inspect.js";

export interface ConsoleHandlers {
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  onCommand?: (text: string) => void;
  onCopyLogs?: () => void;
  onCopyEvents?: () => void;
}

/**
 * Scrollback plus a short command line. The line only forwards known words
 * to shell actions. Channels stay on each row for later advisor or story views.
 */
export function EventConsole(entries: readonly ConsoleEntry[], handlers: ConsoleHandlers = {}): HTMLElement {
  const el = document.createElement("section");
  el.className = "terminal";
  el.dataset.component = "EventConsole";
  el.dataset.terminal = "scrollback";

  const head = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = "Terminal";
  const actions = document.createElement("span");
  actions.className = "terminal-actions";
  actions.append(textButton("Copy logs", handlers.onCopyLogs), textButton("Copy events JSON", handlers.onCopyEvents));
  head.append(title, actions);

  const list = document.createElement("ol");
  list.className = "scrollback";
  for (const entry of entries) {
    const line = document.createElement("li");
    line.dataset.eventType = entry.eventType;
    line.dataset.channel = entry.channel;
    line.dataset.role = entry.role;
    line.dataset.index = String(entry.index);
    if (entry.selectable) {
      line.tabIndex = 0;
      if (entry.index === handlers.selectedIndex) line.dataset.selected = "true";
      const choose = () => handlers.onSelect?.(entry.index);
      line.addEventListener("click", choose);
      line.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          choose();
        }
      });
    }

    const index = document.createElement("span");
    index.className = "term-index";
    index.textContent = String(Math.max(0, entry.index)).padStart(3, "0");

    const kind = document.createElement("span");
    kind.className = "term-kind";
    kind.textContent = entry.eventType;

    const text = document.createElement("span");
    text.className = "term-text";
    text.textContent = entry.text;

    line.append(index, kind, text);
    list.append(line);
  }

  const prompt = document.createElement("form");
  prompt.className = "terminal-prompt";
  const mark = document.createElement("span");
  mark.textContent = "nexus>";
  const input = document.createElement("input");
  input.className = "terminal-input";
  input.name = "command";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Terminal command");
  prompt.append(mark, input);
  prompt.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = "";
    handlers.onCommand?.(text);
  });

  el.append(head, list, prompt);
  return el;
}

function textButton(label: string, onClick?: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => onClick?.());
  return button;
}
