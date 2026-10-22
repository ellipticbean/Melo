import { BaseNowPlayingComponent } from "../base/BaseNowPlayingComponent";

const fishyReminderDependencies = ["fishyProfile"] as const;

export class FishyReminderComponent extends BaseNowPlayingComponent<
  typeof fishyReminderDependencies
> {
  static componentName = "pond-reminder";
  static friendlyName = "Pond reminder";
  static patronOnly = true;
  readonly dependencies = fishyReminderDependencies;

  render() {
    if (this.values.fishyProfile?.canFish()) {
      return { size: 0, string: "🐸" };
    }

    return { size: 0, string: "" };
  }
}
