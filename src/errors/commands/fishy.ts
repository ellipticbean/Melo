import { Chance } from "chance";
import { FishyProfile } from "../../database/entity/fishy/FishyProfile";
import { bold, code } from "../../helpers/discord";
import { EmojiMention } from "../../lib/context/arguments/parsers/EmojiParser";
import { ClientError } from "../errors";

export class FishyNotFoundError extends ClientError {
  name = "NatureDiscoveryNotFoundError";

  constructor(name?: string | EmojiMention) {
    super(
      `Couldn't find a nature discovery with ${
        typeof name === "string" ? `the name ${code(name)}` : `the emoji ${name?.raw}`
      }!`
    );
  }
}

const pondCooldownQuotes: Array<(time: string) => string> = [
  (t) => `The frogs need a breather. Come back in ${t}.`,
  (t) => `The pond is taking a quiet moment. Try again in ${t}.`,
  (t) => `The reeds are rustling, but it's not time to explore yet. Wait ${t}.`,
  (t) => `The little pond is resting. Check back in ${t}.`,
];

const cooldownMessages: Array<(time: string) => string> = [
  ...pondCooldownQuotes,
  (t) => `You can explore the pond again in ${t}.`,
  (t) => `Nothing new is stirring; try again in ${t}.`,
  (t) => `The pond is quiet for now. Come back in ${t}.`,
];

export class CantFishYetError extends ClientError {
  name = "CantExploreYetError";

  constructor(fishyProfile: FishyProfile) {
    super(Chance().pickone(cooldownMessages)(bold(fishyProfile.getCooldownTime())));
  }
}

export class SenderUserHasNoFishyProfileError extends ClientError {
  name = "NoPondJournalError";

  constructor(prefix: string) {
    super(`You don't have a pond journal yet! Run \`${prefix}pond\` to start exploring.`);
  }
}

export class MentionedUserHasNoFishyProfileError extends ClientError {
  name = "MentionedUserHasNoPondJournalError";

  constructor() {
    super("That user doesn't have a pond journal yet.");
  }
}
