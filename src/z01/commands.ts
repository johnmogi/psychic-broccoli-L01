export const COMMANDS = ["help", "run", "batch", "compare", "copy logs", "copy events", "clear"] as const;

export type CommandAction = "help" | "run" | "batch" | "compare" | "copy-logs" | "copy-events" | "clear" | "unknown";

export interface RoutedCommand {
  action: CommandAction;
  line: string;
}

const HELP = "Commands: help, run, batch, compare, copy logs, copy events, clear.";

/** Routes a typed line to an existing shell action. It does not interpret game rules. */
export function routeCommand(input: string): RoutedCommand {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  switch (text) {
    case "help":
      return { action: "help", line: HELP };
    case "run":
      return { action: "run", line: "run" };
    case "batch":
      return { action: "batch", line: "batch" };
    case "compare":
      return { action: "compare", line: "compare" };
    case "copy logs":
      return { action: "copy-logs", line: "copy logs" };
    case "copy events":
      return { action: "copy-events", line: "copy events" };
    case "clear":
      return { action: "clear", line: "clear" };
    default:
      return { action: "unknown", line: `Unknown command "${input.trim()}". Type help.` };
  }
}

/** Zero-based event id, shared by the timeline, terminal rows, and copied logs. */
export function formatEventIndex(index: number): string {
  return `#${String(Math.max(0, index)).padStart(3, "0")}`;
}

export function scrollbackText(entries: readonly { index: number; eventType: string; text: string }[]): string {
  return entries.map((entry) => `${formatEventIndex(entry.index)}  ${entry.eventType}  ${entry.text}`).join("\n");
}

export function eventsJson(events: readonly unknown[]): string {
  return JSON.stringify(events.map((event, index) => ({ index: formatEventIndex(index), event })), null, 2);
}
