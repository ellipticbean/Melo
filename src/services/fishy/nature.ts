import { FishyEmoji } from "../../lib/emoji/FishyEmoji";
import { Fishy, FishyDisplayMode, Level1Fishy, Level2Fishy, Level3Fishy } from "./Fishy";
import { FishyRarities, FishyRarityData } from "./rarity";
import { FishyRarityEmojis } from "../../lib/emoji/FishyRarityEmoji";
import { FishyTrait } from "./traits";
import { FishyNameTrait } from "./traits/name";
import { FishyPhysicalTrait } from "./traits/physical";

const icon = (symbol: string) => new FishyEmoji(symbol, symbol, "❔");
const mythicRarity = new FishyRarityData(
  "Mythic",
  0.3,
  "#e91e63",
  FishyRarityEmojis.mythic,
  "special",
  true
);

function discovery(
  id: string,
  name: string,
  scientificName: string,
  rarity: FishyRarityData,
  emoji: string,
  minSize: number,
  maxSize: number,
  description: string,
  level: 1 | 2 | 3 = 1,
  traits: FishyTrait[] = [FishyNameTrait.Adjective],
  displayMode: FishyDisplayMode = FishyDisplayMode.Floating,
  article: "a" | "an" | "the" | "" = "a"
): Fishy {
  const options = {
    id,
    name,
    binomialName: scientificName,
    rarity,
    emoji: icon(emoji),
    description,
    weight: { min: minSize, max: maxSize },
    traits,
    displayMode,
    article,
  };

  if (level === 3) return new Level3Fishy(options);
  if (level === 2) return new Level2Fishy(options);
  return new Level1Fishy(options);
}

// The existing database schema stores a numeric "weight"; Frog Pond treats
// that value as approximate size in centimetres to avoid changing migrations.
export const trash = [
  discovery("fallen-leaf", "Fallen Leaf", "Folium deciduum", FishyRarities.Trash, "🍂", 1, 4, "A leaf that drifted into the pond.", 1, [], FishyDisplayMode.Bottom),
  discovery("smooth-pebble", "Smooth Pebble", "Saxum laeve", FishyRarities.Trash, "🪨", 2, 5, "A small stone polished by moving water.", 1, [], FishyDisplayMode.Bottom),
  discovery("driftwood", "Driftwood", "Lignum natans", FishyRarities.Trash, "🪵", 3, 9, "A little piece of wood resting in the shallows.", 1, [], FishyDisplayMode.Bottom),
  discovery("reed-seed", "Reed Seed", "Semina arundinis", FishyRarities.Trash, "🌾", 1, 2, "A seed caught among the reeds.", 1, [], FishyDisplayMode.Floating),
];

export const commonFishies = [
  discovery("green-frog", "Green Frog", "Lithobates clamitans", FishyRarities.Common, "🐸", 5, 9, "A familiar pond frog with a bright green back.", 1, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("tadpole", "Tadpole", "Anura larva", FishyRarities.Common, "🫧", 1, 3, "A tiny tadpole paddling through the water.", 1),
  discovery("pond-snail", "Pond Snail", "Lymnaeidae", FishyRarities.Common, "🐌", 1, 4, "A slow little snail grazing on pond plants.", 1),
  discovery("water-lily", "Water Lily", "Nymphaeaceae", FishyRarities.Common, "🪷", 5, 12, "A floating flower resting on the pond's surface.", 1),
  discovery("dragonfly", "Dragonfly", "Anisoptera", FishyRarities.Common, "🪰", 3, 6, "A quick-winged hunter skimming over the water.", 1),
  discovery("water-strider", "Water Strider", "Gerridae", FishyRarities.Common, "🪲", 1, 2, "A tiny insect walking across the water's surface.", 1),
  discovery("cattail-sprout", "Cattail Sprout", "Typha", FishyRarities.Common, "🌾", 3, 10, "A young cattail growing at the water's edge.", 1),
  discovery("wild-mint", "Wild Mint", "Mentha arvensis", FishyRarities.Common, "🌿", 2, 8, "A fragrant patch of mint beside the pond.", 1),
  discovery("shelf-mushroom", "Shelf Mushroom", "Polyporaceae", FishyRarities.Common, "🍄", 2, 6, "A small mushroom growing on damp wood.", 1),
  discovery("water-beetle", "Water Beetle", "Dytiscidae", FishyRarities.Common, "🪲", 1, 3, "A shiny beetle paddling beneath the surface.", 1),
];

export const uncommonFishy = [
  discovery("red-eyed-tree-frog", "Red-Eyed Tree Frog", "Agalychnis callidryas", FishyRarities.Uncommon, "🐸", 4, 7, "A vivid tree frog with bright red eyes.", 1, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("salamander", "Salamander", "Caudata", FishyRarities.Uncommon, "🦎", 5, 12, "A secretive amphibian hiding under wet leaves.", 1),
  discovery("firefly", "Firefly", "Lampyridae", FishyRarities.Uncommon, "✨", 1, 2, "A little beetle whose abdomen glows in the dark.", 1),
  discovery("newt", "Newt", "Pleurodelinae", FishyRarities.Uncommon, "🦎", 5, 10, "A newt exploring the shaded edge of the pond.", 1),
  discovery("blue-dragonfly", "Blue Dragonfly", "Anisoptera caerulea", FishyRarities.Uncommon, "🪰", 3, 6, "A dragonfly with a bright blue shimmer.", 1, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("turtle-hatchling", "Turtle Hatchling", "Testudines", FishyRarities.Uncommon, "🐢", 2, 5, "A tiny turtle making its first trip to the water.", 1),
  discovery("frogspawn", "Frogspawn", "Anura ova", FishyRarities.Uncommon, "🫧", 1, 5, "A cluster of eggs gently bobbing among the reeds.", 1),
  discovery("mossy-stone", "Mossy Stone", "Saxum muscosum", FishyRarities.Uncommon, "🪨", 4, 12, "A stone covered in soft, deep-green moss.", 1),
];

export const rareFishies = [
  discovery("glasswing-dragonfly", "Glasswing Dragonfly", "Neurothemis vitrata", FishyRarities.Rare, "🪽", 3, 7, "A delicate dragonfly whose wings seem almost transparent.", 2, [FishyNameTrait.Adjective, FishyPhysicalTrait.Transparent]),
  discovery("moonlit-frog", "Moonlit Frog", "Litoria noctiluca", FishyRarities.Rare, "🐸", 6, 10, "A pale frog that appears only on quiet nights.", 2, [FishyNameTrait.Adjective]),
  discovery("silver-water-lily", "Silver Water Lily", "Nymphaea argentea", FishyRarities.Rare, "🪷", 8, 15, "A silvery lily that catches even the faintest light.", 2, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("spotted-salamander", "Spotted Salamander", "Ambystoma maculatum", FishyRarities.Rare, "🦎", 10, 20, "A dark salamander marked with bright spots.", 2, [FishyNameTrait.Adjective, FishyPhysicalTrait.Spotted]),
  discovery("foxfire-mushroom", "Foxfire Mushroom", "Mycena luxaeterna", FishyRarities.Rare, "🍄", 3, 10, "A faintly glowing mushroom on a rotting log.", 2, [FishyNameTrait.Adjective]),
  discovery("heron-feather", "Heron Feather", "Ardeidae pluma", FishyRarities.Rare, "🪶", 5, 15, "A long feather left behind by a visiting heron.", 2),
];

export const superRareFishies = [
  discovery("golden-frog", "Golden Frog", "Anura aurea", FishyRarities.SuperRare, "🐸", 5, 10, "A golden frog glimmering among the lily pads.", 2, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("glow-moss", "Glow Moss", "Bryum lucens", FishyRarities.SuperRare, "✨", 3, 12, "A patch of moss that glows softly after sunset.", 2, [FishyNameTrait.Adjective]),
  discovery("crystal-dragonfly", "Crystal Dragonfly", "Anisoptera crystallina", FishyRarities.SuperRare, "🪰", 4, 8, "A glassy-winged dragonfly with a crystal-clear shimmer.", 2, [FishyNameTrait.Adjective]),
  discovery("moonflower", "Moonflower", "Ipomoea alba", FishyRarities.SuperRare, "🌙", 8, 16, "A white flower that opens only after dusk.", 2),
  discovery("ancient-shell", "Ancient Shell", "Concha antiqua", FishyRarities.SuperRare, "🐚", 5, 20, "A shell worn smooth by years in the pond.", 2, [], FishyDisplayMode.Bottom, "an"),
];

export const legendaryFishies = [
  discovery("will-o-wisp", "Will-o'-the-Wisp", "Ignis fatuus", FishyRarities.Legendary, "🔥", 1, 3, "A wandering light that dances just above the water.", 3),
  discovery("rainbow-newt", "Rainbow Newt", "Caudata iridis", FishyRarities.Legendary, "🦎", 10, 20, "A newt whose skin shimmers with every colour.", 3, [FishyNameTrait.Adjective, FishyNameTrait.Color]),
  discovery("celestial-lotus", "Celestial Lotus", "Nelumbo caelestis", FishyRarities.Legendary, "🪷", 10, 25, "A lotus that seems to hold a tiny star in each petal.", 3),
  discovery("fairy-ring-mushroom", "Fairy-Ring Mushroom", "Mycena faerie", FishyRarities.Legendary, "🍄", 8, 30, "A circle of mushrooms said to mark a hidden path.", 3, [FishyNameTrait.Adjective]),
  discovery("pond-spirit", "Pond Spirit", "Spiritus stagni", FishyRarities.Legendary, "🌌", 10, 30, "A shy little spirit that appears when the pond is perfectly still.", 3),
];

export const specialFishies = [
  discovery("moon-crowned-frog", "Moon-Crowned Frog", "Anura lunaris", mythicRarity, "🐸", 6, 12, "A mythical frog wearing a crown of moonlight.", 3, [FishyNameTrait.Adjective]),
  discovery("tiny-pond-dragon", "Tiny Pond Dragon", "Draco palustris", mythicRarity, "🐉", 12, 24, "A miniature dragon that naps beneath lily pads.", 3, [FishyNameTrait.Adjective]),
  discovery("first-lily", "The First Lily", "Nymphaea prima", mythicRarity, "🪷", 12, 28, "An ancient lily said to have bloomed before the pond had a name.", 3, [FishyNameTrait.Adjective], FishyDisplayMode.Floating, "the"),
];
