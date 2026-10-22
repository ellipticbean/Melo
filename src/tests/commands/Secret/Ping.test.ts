import "../../shims";

import Ping from "../../../commands/Secret/Ping";
import {
  mockContextForCommand,
  mockExtractedCommand,
} from "../../../mocks/MockContext";
import { setMockServices } from "../../../mocks/services/mockServices";

describe("Ping command", () => {
  beforeEach(setMockServices);

  test("should pong", async () => {
    const { command: ping, ctx } = mockContextForCommand(Ping);

    await ping.execute(ctx);

    const response = ctx.latestResponse<{ content: string }>().content;

    expect(response).toMatch(/(pong|pang)/i);
  });

  test("should pon", async () => {
    const { command: ping, ctx } = mockContextForCommand(Ping, {
      extract: mockExtractedCommand("pin"),
    });

    await ping.execute(ctx);

    const response = ctx.latestResponse<{ content: string }>().content;

    expect(response).toBe("Pon 🏓");
  });
});
