import { tele } from "../src/index";
import { join } from "path";
import {
  CLI_OPEN_TELEMETRY_DIAGNOSE,
  OTLP_HEADERS,
  OTLP_URL,
  sleep
} from "./utils";

describe("Test cli-open telemetry", () => {
  beforeAll(() => {
    process.env.CLI_OPEN_TELEMETRY_DIAGNOSE = CLI_OPEN_TELEMETRY_DIAGNOSE;
  });

  test("test for command with error", async () => {
    process.env.CLI_OT_MOCK_TIMEOUT = "500";
    process.env.CLI_OT_MOCK_ERROR = "true";
    await tele(
      "test-cli-telemetry-error",
      join(__dirname, "mock-command.js"),
      "1.0.0",
      OTLP_URL,
      OTLP_HEADERS
    );
    expect(process.exitCode).toEqual(1);
    await sleep(2000);
  });
});
