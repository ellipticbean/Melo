import { icons } from "./icons";
import { NativeEmoji } from "./nativeEmojis";

const extractionRegex = /<a?:\w+:([0-9]+)>/i;
const nameExtractionRegex = /<a?(:\w+:)[0-9]+>/i;

export function extractEmojiID(emoji: string): string {
  const id = extractionRegex.exec(emoji);

  return (id as RegExpMatchArray)?.[1] ?? "";
}

export function extractEmojiName(emoji: string): string {
  const name = emoji.match(nameExtractionRegex);

  return (name as RegExpMatchArray)[1];
}

export const Emoji = {
  ...NativeEmoji,
  ...icons,

  spotify: "<:spotify:757100448548126720>",
  lastfm: "<:lastfm:879259073143517224>",
  gowonswag2: "🎶",
  typescript: "<:typescript:746450416635609199>",
  gowonheart: "💚",
  wail: "<:wail:751562824366555146>",
  gnop: "<:gnop:772245126571360256>",
  joppinh: "<a:joppinh:755881087905038387>",
  loading: "<a:loading:784905179451359252>",
  ish: "<:ish:785397271725604875>",
  fmbot: "<:fmbot:822230495713689650>",
  rem: "<:rem:826270521788072026>",
  gowonRated: "<:gowonRated:843400034770223114>",
  blank: "<:blank:848334266928463882>",
  bruh: "<a:bruh:851935710298767371>",
  shitsfucked: "<:shitsfucked:857123087194521643>",
  gowonPeek: "<:gowonpeek:790528424933589002>",
  fuckyou: "<a:fuckyou:858239446577840140>",
  gowonLitDance: "<a:gowonLitDance:861185566233985044>",
  gowonPatreon: "<:gowonpatreon:883948448301334589>",
  404: "<:404:869383534429737031>",
  gowonScrobbled: "<:gowonScrobbled:944727673022849154>",
  fip: "<:fip:959302552443314227>",

  // Crowns
  yoink: "<:yoink:878053740941287434>",
  yoimk: "<:yoimk:1081458841960591430>",
  baited: "<:baited:1088895477300334644>",

  // Uses indexed data
  usesIndexedDataDescription: "<:uses_indexed_data:1056207690474467359>",
  usesIndexedDataLink: "<:uses_indexed_data2:1056204845683581048>",
  usesIndexedDataTitle: "<:uses_indexed_data3:1056207688696086581>",

  // Roles
  contentmoderator: "<:contentmoderator:913203995542175794>",
  alphatester: "💚",
  betatester: "<:betatester:913203995663798322>",
  developer: "<:developer:913203995470888990>",
  "#swag": "<:swag:936102174394581032>",

  // Aquarium
  aquariumLeft: "🌿",
  aquariumRight: "🌿",
  aquariumTop: "🪷",
  aquariumBottom: "🪨",
  aquariumBottomLeft: "🪵",
  aquariumBottomRight: "🪵",
  aquariumTopLeft: "🌱",
  aquariumTopRight: "🌱",
  aquariumCoral: "🍄",
  aquariumMoyai: "🪨",
  aquariumCastle: "🏡",
  aquariumPlant: "🌿",
  aquariumRock: "🪨",
  aquariumWater: "🟦",
  bubbles1: "🫧",
  bubbles2: "💧",
  bubbles3: "🫧",

  // Fishy quests
  fishyQuestBook: "📖",
  fishyQuestComputer: "💻",
  fishyQuestDocument: "📄",
  fishyQuestEnvelope: "✉️",
  fishyQuestNewspaper: "📰",
  fishyQuestPhone: "📱",
  fishyQuestScroll: "📜",
  fishyQuestTV: "📺",
  fishyQuestSpoken: "💬",

  // Fishy misc
  newFishy: "✨",
  level1Fishy: "🐸",
  level2Fishy: "🪲",
  level3Fishy: "🪷",
  naan: "<:Naan:1124419258647072981>",
} satisfies Record<string, string>;

export const EmojiRaw = Object.entries(Emoji).reduce(
  (acc, [shortName, code]) => {
    (acc as any)[shortName] = extractEmojiID(code);

    return acc;
  },
  {} as { [key in keyof typeof Emoji]: string }
);
