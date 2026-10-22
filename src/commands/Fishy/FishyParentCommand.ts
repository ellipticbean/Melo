import { CommandGroup } from "../../lib/command/CommandGroup";
import { ParentCommand } from "../../lib/command/ParentCommand";
import { Habitat } from "./Aquarium";
import { Collection } from "./Collection";
import { Cooldown } from "./Cooldown";
import { Explore } from "./Fish";
import { FieldGuide } from "./Fishypedia";
import { Help } from "./Help";
import { Profile } from "./Profile";
import { Quest } from "./Quest";
import { pondAliases } from "./fishyAliases";

export default class FishyParentCommand extends ParentCommand {
  idSeed = "le sserafim kazuha";

  description = "Explore a quiet pond and build a nature journal";
  friendlyName = "pond";

  prefixes = ["pond", "nature"];
  default = () => new Explore();
  customHelp = Help;

  category = "pond";

  noPrefixAliases = [
    ...pondAliases.filter((a) => a !== "pond" && a !== "nature"),
    "fieldguide",
    "pondguide",
    "pondcollection",
    "pc",
    "pondtimer",
    "pt",
    "pondstats",
    "ps",
    "pondprofile",
    "pp",
    "habitat",
    "pondhabitat",
    "pondquest",
    "pq",
    "pondhelp",
  ];

  children = new CommandGroup(
    [Habitat, Collection, Cooldown, Explore, FieldGuide, Help, Profile, Quest],
    this.id
  );
}
