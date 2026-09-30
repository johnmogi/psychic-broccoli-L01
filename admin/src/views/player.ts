import type { PlayerModel } from "../../../src/z01/inspect.js";
import { ZoneView } from "./zone.js";

export function PlayerPanel(player: PlayerModel): HTMLElement {
  const el = document.createElement("section");
  el.className = player.highlighted ? "player is-highlight" : "player";
  el.dataset.component = "PlayerPanel";
  el.dataset.player = player.id;
  if (player.active) el.dataset.active = "true";
  if (player.highlighted) el.dataset.highlight = "true";

  const head = document.createElement("header");
  const name = document.createElement("h2");
  name.textContent = player.id;
  head.append(name);
  if (player.active) {
    const mark = document.createElement("span");
    mark.textContent = "next";
    head.append(mark);
  }

  const readout = document.createElement("div");
  readout.className = "lineage-readout";
  const currentLabel = document.createElement("span");
  currentLabel.textContent = "Current";
  const current = document.createElement("strong");
  current.className = "lineage-current";
  current.textContent = player.currentLineage;
  const pathLabel = document.createElement("span");
  pathLabel.textContent = "Path";
  const path = document.createElement("span");
  path.className = "lineage-path";
  path.textContent = player.lineagePath;
  readout.append(currentLabel, current, pathLabel, path);

  const zones = document.createElement("div");
  zones.className = "player-zones";
  for (const zone of player.zones) zones.append(ZoneView(zone));

  el.append(head, readout, zones);
  return el;
}
