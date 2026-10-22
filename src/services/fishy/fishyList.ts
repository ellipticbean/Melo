import { extractEmojiID } from "../../lib/emoji/Emoji";
import { Fishy } from "./Fishy";
import {
  commonFishies,
  legendaryFishies,
  rareFishies,
  specialFishies,
  superRareFishies,
  trash,
  uncommonFishy,
} from "./nature";
import { FishyRarities, FishyRarityData } from "./rarity";

export {
  commonFishies,
  legendaryFishies,
  rareFishies,
  specialFishies,
  superRareFishies,
  trash,
  uncommonFishy,
};

export const fishyList = [
  ...trash,
  ...commonFishies,
  ...uncommonFishy,
  ...rareFishies,
  ...superRareFishies,
  ...legendaryFishies,
  ...specialFishies,
];

export function getFishyList(
  rarity?: FishyRarityData,
  fishyProfileLevel?: number
): Fishy[] {
  let discoveries: Fishy[];

  switch (rarity?.name) {
    case undefined:
      discoveries = fishyList;
      break;
    case FishyRarities.Trash.name:
      discoveries = trash;
      break;
    case FishyRarities.Common.name:
      discoveries = commonFishies;
      break;
    case FishyRarities.Uncommon.name:
      discoveries = uncommonFishy;
      break;
    case FishyRarities.Rare.name:
      discoveries = rareFishies;
      break;
    case FishyRarities.SuperRare.name:
      discoveries = superRareFishies;
      break;
    case FishyRarities.Legendary.name:
      discoveries = legendaryFishies;
      break;
    default:
      discoveries = specialFishies.filter((f) => f.rarity.name === rarity!.name);
  }

  if (fishyProfileLevel !== undefined) {
    return discoveries.filter((f) => fishyProfileLevel >= f.requiredFishyLevel);
  }
  return discoveries;
}

export function findFishy(
  name: string | { byID: string } | { byEmoji: string }
): Fishy | undefined {
  const equalize = (str: string) => str.toLowerCase().replace(/[\s-_]+/, "");

  return fishyList.find((f) => {
    return typeof name === "string"
      ? equalize(f.name) === equalize(name) || equalize(f.id) === equalize(name)
      : isByEmoji(name)
      ? extractEmojiID(f.emoji) === extractEmojiID(name.byEmoji) ||
        extractEmojiID(f.emojiInWater) === extractEmojiID(name.byEmoji)
      : f.id === name.byID;
  });
}

function isByEmoji(
  name: Record<string, string | string>
): name is { byEmoji: string } {
  return typeof (name as any)?.byEmoji === "string";
}
