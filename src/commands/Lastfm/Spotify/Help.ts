import { HelpEmbed } from "../../../lib/ui/embeds/HelpEmbed";
import { SpotifyChildCommand } from "./SpotifyChildCommand";

export class Help extends SpotifyChildCommand {
  idSeed = "viviz eunha";

  description = "See help about Melo's Spotify integration";
  aliases = ["help", "spotifyhelp", "shelp"];
  usage = ["public", "private"];

  async run() {
    const embed = new HelpEmbed().setHeader("Help with Spotify")
      .setDescription(`
Use the help command to browse available commands.

To connect your Spotify account, run \`${this.prefix}slogin\`
To change your Spotify privacy, see \`${this.prefix}sprivacy\`
To see help for managing Spotify playlists, see \`${this.prefix}help pl\`
`);

    await this.reply(embed);
  }
}
