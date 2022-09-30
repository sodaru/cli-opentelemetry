import {
  trace,
  SpanStatusCode,
  diag,
  DiagConsoleLogger,
  DiagLogLevel
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { Resource } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  SimpleSpanProcessor
} from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { childProcess, ChildProcessError } from "nodejs-cli-runner";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { v1 as v1uuid } from "uuid";
import { get } from "http";

const httpApi = (url: string) => {
  return new Promise((resolve, reject) => {
    const req = get(url, res => {
      const chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        const body = Buffer.concat(chunks);
        resolve(JSON.parse(body.toString()));
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.on("error", error => {
      reject(error);
    });

    req.end();
  });
};

const getCity = async (force = false) => {
  const tempDir = tmpdir();
  const cacheFilePath = join(tempDir, "sodaru-ot-c");
  let city = "";
  if (!existsSync(cacheFilePath) || force) {
    city = (
      (await httpApi("http://ip-api.com/json/?fields=city")) as { city: string }
    ).city;
    await writeFile(
      cacheFilePath,
      Buffer.from(
        JSON.stringify({ city, validTill: Date.now() + 24 * 60 * 60 * 1000 })
      ).toString("base64")
    );
  } else {
    const cacheDataStr = await readFile(cacheFilePath, { encoding: "utf8" });
    const cacheData = JSON.parse(
      Buffer.from(cacheDataStr, "base64").toString()
    ) as { city: string; validTill: number };
    if (Date.now() < cacheData.validTill) {
      city = cacheData.city;
    } else {
      try {
        city = await getCity(true);
      } catch (e) {
        city = cacheData.city;
      }
    }
  }
  return city;
};

const getDeviceId = async () => {
  const tempDir = tmpdir();
  const deviceIdFilePath = join(tempDir, "sodaru-ot-id");
  let uuid = "";
  if (!existsSync(deviceIdFilePath)) {
    uuid = v1uuid();
    await writeFile(deviceIdFilePath, uuid);
  } else {
    uuid = await readFile(deviceIdFilePath, { encoding: "utf8" });
  }
  return uuid;
};

export const tele = async (
  cliName: string,
  script: string,
  version: string,
  url = "http://localhost:4318/v1/traces",
  headers: Record<string, string> = {},
  timeoutInMs = 3 * 60 * 1000,
  program: string = null
) => {
  if (process.env.CLI_OPEN_TELEMETRY_DIAGNOSE == "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
  }

  const exporter = new OTLPTraceExporter({
    url,
    headers,
    compression: CompressionAlgorithm.GZIP
  });

  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: cliName + "-cli"
    })
  });

  if ((process.env.CLI_OPEN_TELEMETRY_DISABLE || "0") == "0") {
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  }

  provider.register();

  const tracer = trace.getTracer(cliName);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [node_exe, ...args] = process.argv;

  const span = tracer.startSpan("root");

  span.setAttributes({
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    [SemanticResourceAttributes.PROCESS_COMMAND_ARGS]: args,
    [SemanticResourceAttributes.OS_TYPE]: process.platform
  });

  const promises: Promise<unknown>[] = [];

  promises.push(
    getDeviceId().then(deviceId => {
      span.setAttribute(SemanticResourceAttributes.DEVICE_ID, deviceId);
    })
  );

  promises.push(
    getCity().then(city => {
      span.setAttribute("city", city);
    })
  );

  const childArgs = [...process.argv];
  childArgs.shift();
  childArgs.shift();
  childArgs.unshift(script);

  if (program == null) {
    program = process.platform === "win32" ? "node.exe" : "node";
  }

  const childProcessJob = childProcess(
    process.cwd(),
    program,
    childArgs,
    { show: "on", return: "off" },
    { show: "on", return: "on" }
  ).then(
    () => {
      if (span.isRecording()) {
        span.setStatus({ code: SpanStatusCode.OK });
      }
    },
    e => {
      if (span.isRecording()) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: e instanceof ChildProcessError ? e.result.stderr : e?.message
        });
      }
    }
  );

  promises.push(
    new Promise<void>(resolve => {
      const timeoutId = setTimeout(() => {
        if (span.isRecording()) {
          span.setAttribute("timedout", true);
        }
        resolve();
      }, timeoutInMs);
      childProcessJob.then(() => {
        clearTimeout(timeoutId);
        resolve();
      });
    })
  );

  const telemetryJob = Promise.allSettled(promises).then(async results => {
    span.end();

    await exporter.shutdown();
    if (process.env.CLI_OPEN_TELEMETRY_DIAGNOSE == "true") {
      results.forEach(result => {
        if (result.status == "rejected") {
          // eslint-disable-next-line no-console
          console.debug(result.reason);
        }
      });
    }
  });

  await childProcessJob;
  await telemetryJob;
};

export default tele;
