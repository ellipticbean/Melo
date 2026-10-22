import { Command } from "../../lib/command/Command";
import { displayLink, displayUserTag } from "../../lib/ui/displays";

export default class Github extends Command {
  idSeed = "apink chorom";

  subcategory = "about";
  aliases = ["gh", "source"];
  description = "Displays the GitHub link for the bot";

  async run() {
    const author = await this.gowonClient.client.users.fetch(
      this.gowonClient.specialUsers.developers[0].id
    );

    const embed = this.minimalEmbed()
      .setTitle("Melo's source code </>")
      .setDescription(
        `You can find Melo's bot repository at ${displayLink(
          "ellipticbean/Melo",
          "https://github.com/ellipticbean/Melo"
        )}. Melo retains parts of Gowon's companion architecture, including ${displayLink(
          "gowon-bot/lilac",
          "https://github.com/gowon-bot/lilac"
        )} and ${displayLink(
          "gowon-bot/mirrorball",
          "https://github.com/gowon-bot/mirrorball"
        )}.

Melo is based on Gowon and retains attribution and the AGPL-3.0-or-later license.`
      )
      .setFooter(`Maintained by ${displayUserTag(author)}`)
      .setFooterIcon(author.avatarURL({ dynamic: true }) ?? undefined);

    await this.reply(embed);
  }
}
