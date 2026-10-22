import { Chance } from "chance";
import { bold } from "../../helpers/discord";
import { ArgumentsMap } from "../../lib/context/arguments/types";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {} satisfies ArgumentsMap;

export class Cooldown extends FishyChildCommand<typeof args> {
  idSeed = "csr geumhee";
  aliases = ["pondtimer", "pt"];

  description = "See when you can explore the pond again";

  arguments = args;

  async run() {
    const { fishyProfile } = await this.getMentions({
      fetchFishyProfile: true,
      autoCreateFishyProfile: true,
      fishyProfileRequired: true,
    });

    if (!fishyProfile.canFish()) {
      await this.reply(
        this.minimalEmbed().setDescription(
          `You can explore again in ${bold(fishyProfile.getCooldownTime())}.`
        )
      );
    } else {
      await this.reply(
        this.minimalEmbed().setDescription(this.pickCanFishMessage())
      );
    }
  }

  private pickCanFishMessage(): string {
    return Chance().pickone([
      "✨ Good news! You can explore the pond **now**.",
      "🐸 The pond is lively; you can explore **now**!",
      "🪷 The water lilies are swaying; you can explore **now**!",
      "🪲 Something is buzzing near the reeds; you can explore **now**!",
      "🌿 The pond is ready for another visit **now**!",
    ]);
  }
}
