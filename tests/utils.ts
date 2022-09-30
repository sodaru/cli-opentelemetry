// NOTE: Configure open telemetry collectors
// Or run the local telemetry collector as a docker container,
//     the steps are here https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/otlp-exporter-node
export const OTLP_URL = undefined;
export const OTLP_HEADERS = {};

export const CLI_OPEN_TELEMETRY_DIAGNOSE = "false";

export const sleep = (ms: number) => {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
