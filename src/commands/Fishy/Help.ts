import { HelpEmbed } from "../../lib/ui/embeds/HelpEmbed";
import { FishyChildCommand } from "./FishyChildCommand";

export class Help extends FishyChildCommand {
  idSeed = "csr duna";

  description = "View help about Frog Pond";
  usage = [""];

  slashCommand = true;

  async run() {
    const embed = new HelpEmbed()
      .setHeader("Frog Pond")
      .setDescription(
        `
Frog Pond is a cozy nature-collecting game. Explore the water's edge to discover frogs, insects, plants, mushrooms, and rare pond curiosities.

**Commands**
\`${this.prefix}pond\` — Explore the pond
\`${this.prefix}fieldguide <name>\` — Look up a discovery
\`${this.prefix}pond collection\` — Browse your nature journal
\`${this.prefix}pond cooldown\` — See when you can explore again
\`${this.prefix}pond profile\` — View your naturalist profile and stats
\`${this.prefix}pond quest\` — Get a new nature quest or view your current one
\`${this.prefix}habitat\` — See your pond habitat

If you're a patron, add a pond reminder to your now-playing config with \`${this.prefix}npc add pond-reminder\`.

Take your time, and see what turns up!
`
      )
      .setFooter("Your discoveries are collected in a tiny, endlessly expanding pond journal.");

    await this.reply(embed);
  }
}
