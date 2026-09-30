import { resolveConfig, type AlignmentRule, type L01Config, type MaxJump } from "./config.js";
import { compareConfigs, formatCompare, formatTune, tuneConfigs } from "./compare.js";
import { formatLog } from "./events.js";
import { playGame } from "./engine.js";
import { formatBatch, formatMetrics, metricsFromEvents } from "./metrics.js";
import { runBatch } from "./compare.js";
import { seedList } from "./rng.js";
import { GOLDEN_SEED, playGoldenTutorial } from "./tutorial.js";

export function main(argv: readonly string[]): string {
  const { command, options } = parseArgs(argv);
  if (command === "batch") return formatBatch(runBatch(batchRequest(options)));
  if (command === "compare") return formatCompare(compareConfigs(compareRequest(options)).rows);
  if (command === "tune") return formatTune(tuneConfigs(tuneRequest(options)).rows);
  if (command === "run") {
    const seed = required(options, "seed");
    const state = seed === GOLDEN_SEED ? playGoldenTutorial() : playGame(seed, sharedConfig(options));
    return `${formatLog(state.events)}\n\n${formatMetrics(metricsFromEvents(state.events))}`;
  }
  throw new Error(`Unknown command ${command}. Use run, batch, compare, or tune.`);
}

function batchRequest(options: Record<string, string>) {
  return {
    seeds: seedList(integer(required(options, "seed-start"), "seed-start"), integer(required(options, "runs"), "runs")),
    config: sharedConfig(options),
  };
}

function compareRequest(options: Record<string, string>) {
  const config = sharedConfig(options);
  return {
    runs: integer(required(options, "runs"), "runs"),
    seedStart: integer(required(options, "seed-start"), "seed-start"),
    turnCount: config.turnCount,
    maxEvolutionsPerTurn: config.maxEvolutionsPerTurn,
  };
}

function tuneRequest(options: Record<string, string>) {
  const turns = required(options, "turns")
    .split(",")
    .map((value) => integer(value.trim(), "turns"));
  if (!turns.length) throw new Error("--turns must list at least one length");
  return {
    runs: integer(required(options, "runs"), "runs"),
    seedStart: integer(required(options, "seed-start"), "seed-start"),
    turnCounts: turns,
    maxEvolutionsPerTurn: options["max-evolutions-per-turn"] ? evolutions(options["max-evolutions-per-turn"]) : resolveConfig().maxEvolutionsPerTurn,
  };
}

function sharedConfig(options: Record<string, string>): L01Config {
  const defaults = resolveConfig();
  return resolveConfig({
    turnCount: options["turns"] ? integer(options["turns"], "turns") : defaults.turnCount,
    alignmentRule: options["alignment"] ? alignment(options["alignment"]) : defaults.alignmentRule,
    maxJump: options["max-jump"] ? jump(options["max-jump"]) : defaults.maxJump,
    maxEvolutionsPerTurn: options["max-evolutions-per-turn"]
      ? evolutions(options["max-evolutions-per-turn"])
      : defaults.maxEvolutionsPerTurn,
  });
}

function parseArgs(argv: readonly string[]): { command: string; options: Record<string, string> } {
  const options: Record<string, string> = {};
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
      options[key] = value;
      index += 1;
    } else positionals.push(token);
  }
  return { command: positionals[0] ?? "run", options };
}

function required(options: Record<string, string>, key: string): string {
  const value = options[key];
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function integer(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`--${label} must be an integer`);
  return parsed;
}

function alignment(value: string): AlignmentRule {
  if (value === "sameColor" || value === "sameElement") return value;
  throw new Error("--alignment must be sameColor or sameElement");
}

function jump(value: string): MaxJump {
  if (value === "1" || value === "2") return Number(value) as MaxJump;
  throw new Error("--max-jump must be 1 or 2");
}

function evolutions(value: string): number | "unlimited" {
  if (value === "unlimited") return "unlimited";
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("--max-evolutions-per-turn must be unlimited or a non-negative integer");
  return parsed;
}

const invoked = process.argv[1]?.replaceAll("\\", "/").endsWith("src/cli.ts");
if (invoked) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
