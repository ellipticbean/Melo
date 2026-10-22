import { FishyNotFoundError } from "../../errors/commands/fishy";
import { bold, italic } from "../../helpers/discord";
import { bullet, emDash, quote } from "../../helpers/specialCharacters";
import { Perspective } from "../../lib/Perspective";
import { StringArgument } from "../../lib/context/arguments/argumentTypes/StringArgument";
import { EmojisArgument } from "../../lib/context/arguments/argumentTypes/discord/EmojisArgument";
import { standardMentions } from "../../lib/context/arguments/mentionTypes/mentions";
import { ArgumentsMap } from "../../lib/context/arguments/types";
import { displayNumber } from "../../lib/ui/displays";
import { EmbedView } from "../../lib/ui/views/EmbedView";
import { ScrollingListView } from "../../lib/ui/views/ScrollingListView";
import { TabbedView, TabbedViewTab } from "../../lib/ui/views/TabbedView";
import { Fishy } from "../../services/fishy/Fishy";
import { findFishy, fishyList } from "../../services/fishy/fishyList";
import {
  FishyTrait,
  convertFishyTrait,
  displayFishyTrait,
  matchesFishyTrait,
} from "../../services/fishy/traits";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {
  discovery: new StringArgument({
    index: { start: 0 },
    description: "The nature discovery name to look up",
  }),
  discoveryEmoji: new EmojisArgument({
    index: { start: 0 },
    description: "The nature discovery emoji to look up",
  }),
  discoveryTrait: new StringArgument({
    index: { start: 0 },
    description: "A trait to filter the nature guide",
    preprocessor: (s) => s.toLowerCase(),
  }),
  ...standardMentions,
} satisfies ArgumentsMap;

export class FieldGuide extends FishyChildCommand<typeof args> {
  idSeed = "le sserafim eunchae";
  aliases = ["info", "wiki", "guide", "fg"];

  description = "Look up a creature, plant, or other pond discovery";
  usage = ["name", ":emoji:"];

  arguments = args;

  async run() {
    const trait = convertFishyTrait(this.parsedArguments.discoveryTrait);
    if (trait) {
      await this.listDiscoveries(trait);
      return;
    }

    const { fishyProfile, discordUser } = await this.getMentions({
      fetchFishyProfile: true,
      fetchDiscordUser: true,
    });

    const perspective = this.usersService.discordPerspective(this.author, discordUser);
    const name = this.parsedArguments.discovery;
    const emoji = this.parsedArguments.discoveryEmoji;

    const discovery = emoji?.length
      ? findFishy({ byEmoji: emoji[0].raw })
      : name
      ? findFishy(name)
      : fishyProfile
      ? (await this.fishyService.getLastCatch(fishyProfile))?.fishy
      : undefined;

    if (!discovery) throw new FishyNotFoundError(emoji?.[0] || name);

    const count = fishyProfile
      ? await this.fishyService.countFishy(fishyProfile, discovery)
      : 0;

    const mainTab: TabbedViewTab = {
      name: "main",
      rawEmoji: "📖",
      embed: this.getMainTabEmbed(discovery, count, perspective),
    };
    const traitsTab: TabbedViewTab = {
      name: "traits",
      rawEmoji: "🔎",
      embed: this.getTraitsTabEmbed(discovery),
    };

    const tabbedEmbed = new TabbedView(this.ctx, {
      tabs: discovery.traits.length ? [mainTab, traitsTab] : [mainTab],
    });
    await this.reply(tabbedEmbed);
  }

  private getMainTabEmbed(
    discovery: Fishy,
    count: number,
    perspective: Perspective
  ): EmbedView {
    const embed = this.getBaseTabEmbed(discovery).setDescription(
      `
${discovery.emoji} ${bold(italic(discovery.binomialName), false)}
${discovery.rarity.emoji.forLevel(discovery.requiredFishyLevel)} Level ${discovery.requiredFishyLevel} ${discovery.rarity.name} discovery

${italic(quote(discovery.description))}

${
  count > 0
    ? `${perspective.upper.plusToHave} found this discovery ${bold(displayNumber(count, "time"))}.`
    : `${perspective.upper.plusToHave} never found this discovery.`
}`
    );

    if (!discovery.rarity.isTrash()) {
      embed.addFields({
        name: "Approximate size",
        value: `${discovery.minWeight}-${discovery.maxWeight} cm`,
      });
    }
    return embed;
  }

  private getTraitsTabEmbed(discovery: Fishy): EmbedView {
    return this.getBaseTabEmbed(discovery).setDescription(
      `**Traits**:
 ${discovery.traits.map((t) => `${bullet} ${displayFishyTrait(t).replaceAll("fishy", "discovery")}`).join("\n")}`
    );
  }

  private getBaseTabEmbed(discovery: Fishy): EmbedView {
    return this.minimalEmbed()
      .setHeader("Field Guide")
      .setColour(discovery.rarity.colour)
      .setTitle(discovery.name)
      .setURL(discovery.url);
  }

  private async listDiscoveries(trait: FishyTrait) {
    const discoveries = fishyList.filter(
      (f) => !f.rarity.special && matchesFishyTrait(f, trait)
    );
    const embed = this.minimalEmbed().setTitle(
      `Field Guide results for ${displayFishyTrait(trait, true).replaceAll("fishy", "discovery")}`
    );
    const list = new ScrollingListView(this.ctx, embed, {
      items: discoveries.map(
        (f) =>
          `${f.rarity.emoji.forLevel(f.requiredFishyLevel)} ${f.emoji} ${emDash} ${bold(f.name)} (${f.binomialName})`
      ),
      pageSize: 15,
    });
    await this.reply(list);
  }
}
