import { Chance } from "chance";
import { FishyQuestType } from "../../database/entity/fishy/FishyQuest";
import { quote } from "../../helpers/specialCharacters";
import { displayNumber, displayProgressBar } from "../../lib/ui/displays";
import { displayFishyLevelUp } from "../../lib/ui/fishy";
import { FishyChildCommand } from "./FishyChildCommand";

export class Quest extends FishyChildCommand {
  idSeed = "newjeans minji";
  aliases = ["pondquest", "pq"];

  description = "Complete nature quests";

  async run() {
    const { fishyProfile } = await this.getMentions({
      fetchFishyProfile: true,
      fishyProfileRequired: true,
      autoCreateFishyProfile: false,
    });

    const currentQuest = await this.fishyProgressionService.getCurrentQuest(fishyProfile);

    if (currentQuest) {
      const embed = this.minimalEmbed().setDescription(
        `Your current nature quest:

${currentQuest.emoji} ${quote(currentQuest.name)}

_Discovered ${displayNumber(currentQuest.progress)} of ${displayNumber(currentQuest.count)} so far_
${displayProgressBar(currentQuest.progress, currentQuest.count)}`
      );
      await this.reply(embed);
      return;
    }

    const quest = await this.fishyProgressionService.getNextQuest(fishyProfile);
    await this.fishyProgressionService.saveQuest(quest);

    if (quest.isMilestone && quest.isCompleted) {
      const embed = this.minimalEmbed().setDescription(
        displayFishyLevelUp(fishyProfile.level + 1) +
          ` See your next quest with \`${this.prefix}pond quest\``
      );
      await this.fishyProgressionService.incrementQuestProgress(quest, fishyProfile);
      await this.reply(embed);
      return;
    }

    const embed = this.minimalEmbed().setDescription(
      `You've been ${Chance().pickone(["given", "tasked with", "hired for"])} a new ${quest.isMilestone ? "milestone " : ""}nature quest:

✨ ${quote(quest.name)}` +
        (quest.type === FishyQuestType.Trait
          ? `\n\nUse \`${this.prefix}fieldguide ${quest.stringConstraint}\` to see discoveries that count toward this quest.`
          : "")
    );
    await this.reply(embed);
  }
}
