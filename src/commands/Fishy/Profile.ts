import { ago } from "../../helpers";
import { italic } from "../../helpers/discord";
import { fishyQuestLevelSize } from "../../helpers/fishy";
import { emDash } from "../../helpers/specialCharacters";
import { calculatePercent } from "../../helpers/stats";
import { standardMentions } from "../../lib/context/arguments/mentionTypes/mentions";
import { ArgumentsMap } from "../../lib/context/arguments/types";
import { FishyRarityEmojis } from "../../lib/emoji/FishyRarityEmoji";
import { displayDate, displayNumber } from "../../lib/ui/displays";
import { displayFishyCollectionProgress } from "../../lib/ui/fishy";
import { FishyRarities } from "../../services/fishy/rarity";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {
  ...standardMentions,
} satisfies ArgumentsMap;

export class Profile extends FishyChildCommand<typeof args> {
  idSeed = "csr sihyeon";
  aliases = ["stats", "pondstats", "ps", "pondprofile", "pp"];

  description = "See a user's naturalist profile";

  arguments = args;

  async run() {
    const { fishyProfile } = await this.getMentions({
      fetchFishyProfile: true,
      fishyProfileRequired: true,
      autoCreateFishyProfile: false,
    });

    const [giftsGiven, giftsReceived, biggestFind, rarityBreakdown, collection] =
      await Promise.all([
        this.fishyService.countGiftsGiven(fishyProfile.user.id),
        this.fishyService.countGiftsReceived(fishyProfile.user.id),
        this.fishyService.getBiggestFishy(fishyProfile.user.id),
        this.fishyService.rarityBreakdown(fishyProfile),
        this.fishyService.getCollection(fishyProfile),
      ]);

    const averageSize = fishyProfile.timesFished
      ? displayNumber(fishyProfile.totalWeight / fishyProfile.timesFished, "cm", true)
      : "—";
    const biggestDisplay = biggestFind
      ? `${biggestFind.weight} cm (${italic(biggestFind.fishy.name)} on ${displayDate(biggestFind.fishedAt)})`
      : "No discoveries yet";

    const embed = this.minimalEmbed().setDescription(`
Level **${fishyProfile.level}** naturalist ${emDash} _Exploring since ${displayDate(
      fishyProfile.createdAt
    )} (${ago(fishyProfile.createdAt)})_
${displayNumber(fishyProfile.questsCompleted, "quest")} completed ${emDash} _${fishyQuestLevelSize - (fishyProfile.questsCompleted % fishyQuestLevelSize)} until next level_

**Discoveries made**: ${displayNumber(fishyProfile.timesFished)} (${displayNumber(
      fishyProfile.totalWeight,
      "cm",
      true
    )} total size)
**Gifts**: ${giftsGiven} given / ${giftsReceived} received ${emDash} _${
      giftsReceived ? calculatePercent(giftsGiven, giftsReceived, 0) : "∞"
    }% ratio_

**Largest discovery**: ${biggestDisplay}
**Average size**: ${averageSize}
**Nature journal**: ${displayFishyCollectionProgress(collection)} discoveries

**Discovery rarity breakdown:**
${FishyRarities.Trash.emoji.base} _Everyday finds_ ${emDash} ${displayNumber(rarityBreakdown.Trash)} finds
${FishyRarities.Common.emoji.base} _Common_ ${emDash} ${displayNumber(rarityBreakdown.Common)} discoveries
${FishyRarities.Uncommon.emoji.base} _Uncommon_ ${emDash} ${displayNumber(rarityBreakdown.Uncommon)} discoveries
${FishyRarities.Rare.emoji.base} _Rare_ ${emDash} ${displayNumber(rarityBreakdown.Rare)} discoveries
${FishyRarities.SuperRare.emoji.base} _Super rare_ ${emDash} ${displayNumber(rarityBreakdown.SuperRare)} discoveries
${FishyRarities.Legendary.emoji.base} _Legendary_ ${emDash} ${displayNumber(rarityBreakdown.Legendary)} discoveries
${
  "special" in rarityBreakdown
    ? `${FishyRarityEmojis.mythic.base} _Mythic_ ${emDash} ${displayNumber(
        rarityBreakdown.special as string
      )} discoveries`
    : ""
}
`);

    await this.reply(embed);
  }
}
