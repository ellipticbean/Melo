import { Command } from "../../lib/command/Command";
import { HelpEmbed } from "../../lib/ui/embeds/HelpEmbed";

export default class QuickHelp extends Command {
  idSeed = "hot issue mayna";

  subcategory = "about";
  description = "Displays a quick help menu";
  usage = [""];

  async run() {
    const embed = new HelpEmbed()
      .setHeader(this.ctx.isDM() ? "Quick Help in DMs" : "Quick Help")
      .setDescription(
        `
Welcome to Melo! 🎶

Use \`${this.prefix}login\` to link your Last.fm account.
To browse all commands, run \`${this.prefix}help all\`.
To change the prefix, run \`@Melo prefix <prefix>\` (the current prefix is \`${this.prefix}\`).

Source code and project updates: https://github.com/ellipticbean/Melo
Report a problem: https://github.com/ellipticbean/Melo/issues` +
          (this.ctx.isDM()
            ? `\n\nOnly certain commands can be run in DMs. Use the default prefix \`${this.prefix}\` and run commands as you would normally.`
            : "")
      );

    await this.reply(embed);
  }
}
