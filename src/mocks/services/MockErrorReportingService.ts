import { BaseMockService } from "./BaseMockService";

export class MockErrorReportingService extends BaseMockService {
  async reportError(_ctx: any, _error: Error): Promise<string | undefined> {
    return undefined;
  }
}
