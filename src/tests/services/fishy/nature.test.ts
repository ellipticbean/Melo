import { findFishy, fishyList } from "../../../services/fishy/fishyList";

describe("Frog Pond discovery catalogue", () => {
  it("has unique discovery IDs and no fish-themed discoveries", () => {
    const ids = fishyList.map((discovery) => discovery.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fishyList.some((discovery) => /fish|fishing/i.test(discovery.name))).toBe(
      false
    );
  });

  it("includes common and mythic nature discoveries", () => {
    expect(findFishy("Green Frog")?.id).toBe("green-frog");
    expect(findFishy("The First Lily")?.id).toBe("first-lily");
  });

  it("supports looking up a discovery by its Unicode emoji", () => {
    expect(findFishy({ byEmoji: "🐸" })?.id).toBe("green-frog");
  });

  it("does not depend on custom emojis from the original bot's server", () => {
    expect(fishyList.every((discovery) => !discovery.emoji.includes("<:"))).toBe(
      true
    );
  });
});
