import { GowonContext } from "../../lib/context/Context";
import { BaseMockService } from "./BaseMockService";

export class MockLilacGuildsService extends BaseMockService {
  public async addUser(
    _ctx: GowonContext,
    _discordID: string,
    _guildID: string
  ): Promise<Error | undefined> {
    return undefined;
  }

  public async removeUser(
    _ctx: GowonContext,
    _discordID: string,
    _guildID: string
  ): Promise<Error | undefined> {
    return undefined;
  }

  public async sync(
    _ctx: GowonContext,
    _guildID: string,
    _discordIds: string[]
  ): Promise<void> {}

  public async clear(_ctx: GowonContext, _guildID: string): Promise<void> {}
}
