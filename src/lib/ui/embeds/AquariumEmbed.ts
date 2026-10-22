import { Chance } from "chance";
import { chunkArray, shuffle } from "../../../helpers";
import { bold } from "../../../helpers/discord";
import { Aquarium, AquariumDimensions } from "../../../services/fishy/FishyService.types";
import { Fishy } from "../../../services/fishy/Fishy";
import { displayNumber } from "../displays";
import { EmbedView } from "../views/EmbedView";
import { View } from "../views/View";

export class AquariumEmbed extends View {
  private aquarium!: Aquarium;
  private readonly width = 8;
  private readonly height = 5;

  constructor(private baseEmbed: EmbedView) {
    super({});
  }

  setAquarium(aquarium: Aquarium): this {
    this.aquarium = aquarium;
    return this;
  }

  asDiscordSendable(): EmbedView {
    const discoveries = this.aquarium.fishies.map((item) => item.fishy);
    const pond = this.renderPond({ width: this.width, height: this.height }, discoveries);
    const message = this.getPondMessage(discoveries);
    const mostAbundant = this.aquarium.size
      ? `The most common visitor is ${bold(this.aquarium.mostAbundantFish.name)}.`
      : "The pond is waiting for its first visitor.";

    return this.baseEmbed.setDescription(`
_${message}_

${pond}

There are **${displayNumber(this.aquarium.size)} discoveries** in your pond.
${mostAbundant}
`);
  }

  private renderPond(
    { width, height }: AquariumDimensions,
    discoveries: Fishy[]
  ): string {
    const cells = new Array<string>(width * height).fill("🟦");
    const visible = shuffle(discoveries).slice(0, cells.length);
    const positions = shuffle(cells.map((_, index) => index));

    visible.forEach((discovery, index) => {
      cells[positions[index]] = discovery.emojiInWater;
    });

    const rows = chunkArray(cells, width);
    const top = ["🌱", ...new Array<string>(width).fill("🪷"), "🌱"];
    const middle = rows.map((row) => ["🌿", ...row, "🌿"]);
    const bottom = ["🪵", ...new Array<string>(width).fill("🪨"), "🪵"];

    return [top, ...middle, bottom].map((row) => row.join("")).join("\n");
  }

  private getPondMessage(discoveries: Fishy[]): string {
    const count = discoveries.length;

    if (count === 0) {
      return Chance().pickone([
        "The pond is quiet, with only a few ripples on the surface.",
        "The reeds sway gently. Maybe a visitor will appear soon.",
        "A dragonfly passes by, but the pond is otherwise peaceful.",
        "The water is still for now. Nature has its own schedule.",
      ]);
    }
    if (count === 1) {
      const visitor = discoveries[0];
      return Chance().pickone([
        `A ${visitor.name} peeks out from among the lily pads.`,
        `${visitor.name} is enjoying a quiet moment by the water.`,
        `You spot one ${visitor.name} making itself at home.`,
      ]);
    }
    if (count <= 3) {
      return Chance().pickone([
        `A few pond visitors are out and about (${count} spotted).`,
        `The pond is waking up; ${count} little discoveries are in view.`,
        `A small gathering of nature finds has appeared (${count} in sight).`,
      ]);
    }
    return Chance().pickone([
      `The pond is bustling with life: ${count} discoveries are in view!`,
      `A lively day by the water, with ${count} visitors out and about.`,
      `The lily pads are busy today; you can see ${count} pond discoveries.`,
    ]);
  }
}
