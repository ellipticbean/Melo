export class FishyRarityEmoji {
  constructor(public base: string, private levels?: [string, string, string]) {}

  forLevel(level?: number) {
    return level && this.levels ? this.levels[level - 1] : this.base;
  }
}

export const FishyRarityEmojis = {
  trash: new FishyRarityEmoji("🍂"),
  common: new FishyRarityEmoji("🟢", ["🟢", "🟢", "🟢"]),
  uncommon: new FishyRarityEmoji("🔵", ["🔵", "🔵", "🔵"]),
  rare: new FishyRarityEmoji("🟣", ["🟣", "🟣", "🟣"]),
  superRare: new FishyRarityEmoji("💎", ["💎", "💎", "💎"]),
  legendary: new FishyRarityEmoji("✨", ["✨", "✨", "✨"]),
  mythic: new FishyRarityEmoji("🌙"),
  unknown: new FishyRarityEmoji("❔"),
  blahajRarity: new FishyRarityEmoji("🦈"),
} as const satisfies Record<string, FishyRarityEmoji>;
