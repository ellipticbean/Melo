import config from "../../config.json";
import { Command } from "../lib/command/Command";

export default class Invite extends Command {
  idSeed = "iz*one sakura";

  subcategory = "about";
  description = "Invite the bot to your server!";

  slashCommand = true;

  async run() {
    await this.reply(
      `🎵 You can invite Melo to your server with the following link: <https://discord.com/api/oauth2/authorize?client_id=${config.discordClientID}&permissions=51264&scope=applications.commands%20bot>`
    );
  }
}
