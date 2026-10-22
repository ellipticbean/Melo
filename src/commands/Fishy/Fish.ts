import { FishyCatch } from "../../database/entity/fishy/FishyCatch";
import { FishyProfile } from "../../database/entity/fishy/FishyProfile";
import { FishyQuest } from "../../database/entity/fishy/FishyQuest";
import { CantFishYetError } from "../../errors/commands/fishy";
import { bold, italic, mentionGuildMember } from "../../helpers/discord";
import { emDash } from "../../helpers/specialCharacters";
import { LineConsolidator } from "../../lib/LineConsolidator";
import { standardMentions } from "../../lib/context/arguments/mentionTypes/mentions";
import { ArgumentsMap } from "../../lib/context/arguments/types";
import { displayNumber } from "../../lib/ui/displays";
import { displayFishyLevelUp, displayRarity } from "../../lib/ui/fishy";
import { Fishy } from "../../services/fishy/Fishy";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {
  ...standardMentions,
} satisfies ArgumentsMap;

export class Explore extends FishyChildCommand<typeof args> {
  idSeed = "le sserafim yunjin";
  aliases = ["discover", "forage"];

  description = "Explore the pond and discover a nature find";

  arguments = args;

  async run() {
    const { senderFishyProfile, mentionedFishyProfile, fishyProfile } =
      await this.getMentions({
        dbUserRequired: true,
        fetchFishyProfile: true,
        autoCreateFishyProfile: true,
        fishyProfileRequired: true,
      });

    if (!senderFishyProfile?.canFish()) {
      throw new CantFishYetError(senderFishyProfile!);
    }

    const discoveryResult = await this.fishyService.fish(fishyProfile);
    let discoveryCatch: FishyCatch;

    if (mentionedFishyProfile) {
      discoveryCatch = await this.fishyService.saveFishy(
        this.ctx,
        discoveryResult,
        mentionedFishyProfile,
        senderFishyProfile
      );
    } else {
      discoveryCatch = await this.fishyService.saveFishy(
        this.ctx,
        discoveryResult,
        senderFishyProfile
      );
    }

    const { fishy, weight, isNew } = discoveryResult;
    const sizeDisplay = fishy.rarity.isTrash()
      ? ""
      : `\nApproximate size: **${displayNumber(weight)} cm**`;

    await this.fishyService.updateCooldown(senderFishyProfile);

    const { quest, isNewQuest } = await this.getQuest(senderFishyProfile);
    const { madeQuestProgress, questCompleted } = await this.checkQuestProgress(
      quest,
      discoveryCatch,
      senderFishyProfile
    );

    const giftDisplay = !mentionedFishyProfile
      ? ""
      : ` for ${mentionGuildMember(mentionedFishyProfile.user.discordID)}`;

    const discoveryDisplay = this.getDiscoveryDisplay(fishy, isNew, giftDisplay);

    const description = new LineConsolidator().addLines(
      discoveryDisplay,
      sizeDisplay,
      {
        shouldDisplay: !isNewQuest && questCompleted,
        string: `\n✨ You completed your current nature quest!\nRun \`${this.prefix}pond quest\` to get another.`,
      },
      {
        shouldDisplay: !isNewQuest && madeQuestProgress && !questCompleted,
        string: `\n✨ This discovery counts toward your current quest!`,
      },
      {
        shouldDisplay: isNewQuest && questCompleted,
        string: `\n✨ You received and completed a new quest! See \`${this.prefix}pond quest\`.`,
      },
      {
        shouldDisplay: isNewQuest && madeQuestProgress && !questCompleted,
        string: `\n✨ Your new quest already has progress. Run \`${this.prefix}pond quest\` to view it.`,
      },
      {
        shouldDisplay: isNewQuest && !madeQuestProgress,
        string: `\n✨ You received a new nature quest! Run \`${this.prefix}pond quest\` to see it.`,
      }
    );

    const embed = this.minimalEmbed()
      .setColour(fishy.rarity.colour)
      .setDescription(description);

    if (isNew) {
      embed.setFooter(`See ${this.prefix}fieldguide to learn about this discovery`);
    }

    await this.reply(embed);
  }

  private async getQuest(senderFishyProfile: FishyProfile): Promise<{
    quest: FishyQuest;
    isNewQuest: boolean;
  }> {
    const quest = await this.fishyProgressionService.getCurrentQuest(
      senderFishyProfile
    );

    if (quest) {
      return { quest, isNewQuest: false };
    }

    const newQuest = await this.fishyProgressionService.getNextQuest(
      senderFishyProfile
    );
    await this.fishyProgressionService.saveQuest(newQuest);

    return { quest: newQuest, isNewQuest: true };
  }

  private async checkQuestProgress(
    quest: FishyQuest,
    discovery: FishyCatch,
    profile: FishyProfile
  ): Promise<{ madeQuestProgress: boolean; questCompleted: boolean }> {
    const madeQuestProgress = this.fishyProgressionService.countsTowardsQuest(
      quest,
      discovery
    );

    let questCompleted = false;

    if (madeQuestProgress) {
      questCompleted =
        await this.fishyProgressionService.incrementQuestProgress(
          quest,
          profile
        );
    }

    if (quest.isMilestone && quest.isCompleted) {
      const milestoneCompletedEmbed = this.minimalEmbed().setDescription(
        displayFishyLevelUp(profile.level + 1)
      );

      await this.fishyProgressionService.incrementQuestProgress(
        quest,
        profile
      );

      this.reply(milestoneCompletedEmbed);
    }

    return { questCompleted, madeQuestProgress };
  }

  private getDiscoveryDisplay(
    discovery: Fishy,
    isNew: boolean,
    giftDisplay: string
  ): string {
    return `${discovery.emoji} ${bold("Discovered")} ${discovery.article}${bold(
      discovery.name
    )}${isNew ? " ✨" : ""}${giftDisplay}${isNew && !giftDisplay ? "" : "!"}  ${italic(
      emDash + " " + displayRarity(discovery.rarity)
    )}`;
  }
}
