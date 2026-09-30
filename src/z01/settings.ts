import { L01_DEFAULTS, type L01Config } from "../config.js";
import { L02_DEFAULTS, type L02Config } from "../l02/config.js";
import { L03_DEFAULTS, type L03Config } from "../l03/config.js";

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
  layer: "L01" | "L02" | "L03";
  seed: string;
  l01: Partial<L01Config>;
  l02: Partial<L02Config>;
  l03: Partial<L03Config>;
}

/** Form fields are engine config keys. Adding a layer means adding specs, not a new form. */
export function settingSpecs(layer: "L01" | "L02" | "L03", seed = "42"): SettingSpec[] {
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
  if (layer === "L03") {
    return [
      ...shared,
      { id: "turnCount", label: "Turns", control: "number", value: String(L03_DEFAULTS.turnCount) },
      { id: "waterResurfaceEnabled", label: "Water resurface", control: "checkbox", value: "true" },
      { id: "airSwapEnabled", label: "Air swap", control: "checkbox", value: "true" },
      { id: "eclipseEnabled", label: "Eclipse", control: "checkbox", value: "true", note: "Same rank, opposite Sun/Moon back. Element does not matter." },
      { id: "triangulationEnabled", label: "Triangulation", control: "checkbox", value: "true" },
      {
        id: "triangulationMode",
        label: "Triangulation rule",
        control: "select",
        value: L03_DEFAULTS.triangulationMode,
        options: [
          { value: "sameRankMajorSet", label: "same rank — three Princes, Queens, or Kings" },
          { value: "anyThreeMajors", label: "any three majors — experimental" },
        ],
        note: "Combined field: Round Table + PD + altar/resolution majors. Element and back do not matter.",
      },
      {
        id: "majorDeckMode",
        label: "Major deck",
        control: "select",
        value: L03_DEFAULTS.majorDeckMode,
        options: [
          { value: "full", label: "full catalog — all 24 majors eligible" },
          { value: "scripted", label: "scripted prefix — tutorial opening, then the rest of the deck" },
        ],
      },
      {
        id: "majorOverflowMode",
        label: "Major overflow",
        control: "select",
        value: L03_DEFAULTS.majorOverflowMode,
        options: [
          { value: "newestStays", label: "newestStays — incoming major stays, previous altar major goes to Veil" },
          { value: "activeChoice", label: "activeChoice — future hook, currently unavailable" },
        ],
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

export function requestFromValues(layer: "L01" | "L02" | "L03", values: Record<string, string>): RunRequest {
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
    l03: {
      turnCount,
      alignmentRule,
      maxJump,
      waterResurfaceEnabled: values["waterResurfaceEnabled"] !== "false",
      airSwapEnabled: values["airSwapEnabled"] !== "false",
      eclipseEnabled: values["eclipseEnabled"] !== "false",
      triangulationEnabled: values["triangulationEnabled"] !== "false",
      triangulationMode: values["triangulationMode"] === "anyThreeMajors" ? "anyThreeMajors" : "sameRankMajorSet",
      majorDeckMode: values["majorDeckMode"] === "scripted" ? "scripted" : "full",
      majorOverflowMode: values["majorOverflowMode"] === "activeChoice" ? "activeChoice" : "newestStays",
      scriptedMajorIds: values["majorDeckMode"] === "scripted" ? ["major-sun-air-queen", "major-moon-fire-queen", "major-sun-earth-king"] : [],
    },
  };
}
