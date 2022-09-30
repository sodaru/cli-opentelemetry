# CLI Open Telemetry

> Collecting Telemetry information about the CLI Commands Usage helps to understand and improve the tools

> [`Open Telemetry`](https://opentelemetry.io/) is the vendor agnostic standard to collect and process telemetry information

This library helps to collect the telemetry data from CLI Tools and export the data to the OpenTelemetry Collector backend

## Usage

```javascript
// bin/cli.js

require("cli-opentelemetry").tele(
  "cli", // CLI Name
  require("path").join(__dirname, "../dist/index.js"), // Path to Javascript File, CLI Entry point
  "1.0.0", // version of the CLI
  "http://localhost:4318/v1/traces", // URL to OTLP ProtoBuf endpoint (Optional, defaults to http://localhost:4318/v1/traces)
  {}, // Headers to be send to OTLP Endpoint (Optional, defaults to emptry object)
  2000, // timeout in ms , to end the span if the underlying CLI takes more time
  "node" // Program to run, (Optional, defaults to node)
);
```

### Data Collected

- `service.name` - CLI Name + "-cli"
- `service.version` - CLI Version
- `process.command_args` - process.argv
- `os.type` - process.platform
- `device.id` - uuid, uniquely identifying a device
  - generated and stored in `%TEMP%/sodaru-ot-id` file
- `city` - City Name from where the cli is executed
  - generated and stored in `%TEMP%/sodaru-ot-c` each day
- `otel.status_code` - OK or ERROR, based on the CLI result
- `otel.status_description` - stderr from CLI, if CLI fails

### Environmental Variables

- `CLI_OPEN_TELEMETRY_DIAGNOSE` - If set to `true`, Prints telemetry debug logs to console
- `CLI_OPEN_TELEMETRY_DISABLE` - If set to anything other than `0`, The telemetry export is switched Off

## Support

This project is a part of the Open Source Initiative from [Sodaru Technologies](https://sodaru.com)

Write an email to opensource@sodaru.com for queries on this project
