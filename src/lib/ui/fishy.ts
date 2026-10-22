import { bold } from "../../helpers/discord";
import { Fishy } from "../../services/fishy/Fishy";
import { findFishy, fishyList } from "../../services/fishy/fishyList";
import { FishyRarityData } from "../../services/fishy/rarity";

export function displayRarity(
  rarity: FishyRarityData,
  withEmoji?: boolean,
  forFishy?: Fishy
): string {
  const display = rarity.isTrash()
    ? rarity.name
    : `${rarity.special ? "Mythic" : rarity.name} discovery`;

  return withEmoji
    ? rarity.emoji.forLevel(forFishy?.requiredFishyLevel) + " " + display
    : display;
}

const levelUpMessages = [
  "You unlocked the **field notebook**! You can now discover level 2 finds, including unusual amphibians and insects. 🪲",
  "You unlocked **night-walk boots**! You can now discover level 3 finds, including rare and mythical pond life. 🌙",
];

export function displayFishyLevelUp(level: number): string {
  const message = levelUpMessages[level - 2];
  return `You've reached naturalist level ${bold(level)}` + (message ? "\n\n" + message : "");
}

export function displayFishyCollectionProgress(collection: string[]) {
  const noHidden = fishyList.filter((f) => !f.hidden);
  const hiddenCount = collection.filter((id) => findFishy({ byID: id })?.hidden).length;
  const nonHiddenCount = collection.length - hiddenCount;
  return `${nonHiddenCount}${hiddenCount ? `+${hiddenCount}` : ""} of ${noHidden.length}`;
}
