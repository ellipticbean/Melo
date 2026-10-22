import { standardMentions } from "../../lib/context/arguments/mentionTypes/mentions";
import { ArgumentsMap } from "../../lib/context/arguments/types";
import { displayNumberedList } from "../../lib/ui/displays";
import { displayFishyCollectionProgress } from "../../lib/ui/fishy";
import { ScrollingListView } from "../../lib/ui/views/ScrollingListView";
import { Fishy } from "../../services/fishy/Fishy";
import { findFishy, fishyList } from "../../services/fishy/fishyList";
import { FishyChildCommand } from "./FishyChildCommand";

const args = {
  ...standardMentions,
} satisfies ArgumentsMap;

export class Collection extends FishyChildCommand<typeof args> {
  idSeed = "csr yuna";
  aliases = ["col", "completion", "com", "journal"];

  description =
    "Browse your nature journal and see which discoveries you have yet to find.";

  arguments = args;

  async run() {
    const { fishyProfile, discordUser } = await this.getMentions({
      fetchFishyProfile: true,
      fishyProfileRequired: true,
      fetchDiscordUser: true,
    });

    const perspective = this.usersService.discordPerspective(
      this.author,
      discordUser
    );

    const collection = await this.fishyService.getCollection(fishyProfile);
    const noHidden = fishyList.filter((f) => !f.hidden);
    const fishyDisplayList = [
      ...noHidden,
      ...(collection
        .map((c) => findFishy({ byID: c }))
        .filter((f) => f && f.hidden) as Fishy[]),
    ];

    const embed = this.minimalEmbed().setTitle(
      `${perspective.upper.possessive} nature journal`
    );

    const scrollingEmbed = new ScrollingListView(this.ctx, embed, {
      items: fishyDisplayList,
      pageSize: 15,
      pageRenderer(items, { offset }) {
        return (
          `_${displayFishyCollectionProgress(
            collection
           )} discoveries collected_\n\n` +
          displayNumberedList(
            items.map((f) => {
              const owned = collection.includes(f.id);

              return `${f.rarity.emoji.forLevel(f.requiredFishyLevel)} ${
                owned ? f.emoji : f.emojiSilhouette
              } ${owned ? f.name : "???"}`;
            }),
            offset
          )
        );
      },
      overrides: {
        itemName: "discovery to find",
        itemNamePlural: "discoveries to find",
        totalItems: noHidden.length,
      },
    });

    await this.reply(scrollingEmbed);
  }
}
