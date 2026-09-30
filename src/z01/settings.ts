import { L01_DEFAULTS, type L01Config } from "../config.js";
import { L02_DEFAULTS, type L02Config } from "../l02/config.js";

export type SettingControl = "text" | "number" | "select" | "checkbox";

export interface SettingSpec {
  id: string;
  label: string;
  control: SettingControl;
  value: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  note?: string;
}

export interface RunRequest {
  layer: "L01" | "L02";
  seed: string;
  l01: Partial<L01Config>;
  l02: Partial<L02Config>;
}

/** Form fields are engine config keys. Adding a layer means adding specs, not a new form. */
export function settingSpecs(layer: "L01" | "L02", seed = "42"): SettingSpec[] {
  const shared: SettingSpec[] = [
    { id: "seed", label: "Seed", control: "text", value: seed },
    {
      id: "alignmentRule",
      label: "Alignment",
      control: "select",
      value: "sameColor",
      options: [
        { value: "sameColor", label: "sameColor" },
        { value: "sameElement", label: "sameElement" },
      ],
    },
    {
      id: "maxJump",
      label: "Max jump",
      control: "select",
      value: "2",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
      ],
    },
  ];
  if (layer === "L01") {
    return [
      ...shared,
      { id: "turnCount", label: "Turns", control: "number", value: String(L01_DEFAULTS.turnCount) },
      {
        id: "maxEvolutionsPerTurn",
        label: "Evolutions / turn",
        control: "text",
        value: String(L01_DEFAULTS.maxEvolutionsPerTurn),
        note: "unlimited, or an integer",
      },
    ];
  }
  return [
    ...shared,
    { id: "turnCount", label: "Turns", control: "number", value: String(L02_DEFAULTS.turnCount) },
    { id: "waterResurfaceEnabled", label: "Water resurface", control: "checkbox", value: "true" },
    { id: "airSwapEnabled", label: "Air swap", control: "checkbox", value: "true" },
    {
      id: "altarOverflowMode",
      label: "Altar overflow",
      control: "select",
      value: L02_DEFAULTS.altarOverflowMode,
      options: [
        { value: "oldest", label: "oldest" },
        { value: "activeChoice", label: "activeChoice" },
      ],
      note: "activeChoice is an engine hook and still rejects",
    },
  ];
}

export function requestFromValues(layer: "L01" | "L02", values: Record<string, string>): RunRequest {
  const maxJump = values["maxJump"] === "1" ? 1 : 2;
  const alignmentRule = values["alignmentRule"] === "sameElement" ? "sameElement" : "sameColor";
  const turnCount = Number(values["turnCount"]);
  const evolutions = values["maxEvolutionsPerTurn"];
  return {
    layer,
    seed: values["seed"] ?? "",
    l01: {
      turnCount,
      alignmentRule,
      maxJump,
      maxEvolutionsPerTurn: evolutions === "unlimited" || evolutions === undefined ? "unlimited" : Number(evolutions),
    },
    l02: {
      turnCount,
      alignmentRule,
      maxJump,
      waterResurfaceEnabled: values["waterResurfaceEnabled"] !== "false",
      airSwapEnabled: values["airSwapEnabled"] !== "false",
      altarOverflowMode: values["altarOverflowMode"] === "activeChoice" ? "activeChoice" : "oldest",
    },
  };
}
