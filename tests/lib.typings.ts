import { AwaitedMessage } from "../src/typings";

export interface MyTransportMethods {
  test: boolean;
  currentTime: AwaitedMessage<undefined, number>;
  requestData: AwaitedMessage<{ data: string }, { ok: boolean }>;
}
