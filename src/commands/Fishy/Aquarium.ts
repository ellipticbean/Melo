import { ArgumentsMap } from "../../lib/context/arguments/types";
import { AquariumEmbed } from "../../lib/ui/embeds/AquariumEmbed";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {} satisfies ArgumentsMap;

export class Habitat extends FishyChildCommand<typeof args> {
  idSeed = "csr seoyeon";
  aliases = ["habitat", "pondhabitat", "aq"];

  description =
    "Visit your pond habitat and see which discoveries are around.";

  arguments = args;

  async run() {
    const { fishyProfile } = await this.getMentions({
      fetchFishyProfile: true,
      fishyProfileRequired: true,
    });

    const aquarium = await this.fishyService.getAquarium(fishyProfile);

    const embed = this.minimalEmbed()
      .setTitle("Your pond habitat")
      .transform(AquariumEmbed)
      .setAquarium(aquarium);

    await this.reply(embed);
  }
}
