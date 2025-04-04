import { Volume } from "memfs";
import dayjs from "dayjs";
// import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url";
const esbuildWasmURL = new URL("esbuild-wasm/esbuild.wasm", import.meta.url); // rsbuild
import {
  BundlerInBrowser,
  installSassPlugin,
  installVuePlugin,
  wrapCommonJS,
} from "bundler-in-browser";
import installTailwindPlugin from "@bundler-in-browser/tailwindcss";
import type { PartialMessage } from "esbuild-wasm";
import {
  isCompilationRequest,
  newWorkerReadyMessage,
  workerSourceMarker,
  type CompilationSuccessResponse,
  type NPMProgressMessage,
  type WorkerLogMessage,
} from "./common";

main().catch((err) => {
  log("worker main error", err);
  self.postMessage(newWorkerReadyMessage(err));
});
async function main() {
  const fs = Volume.fromJSON({});
  const bundler = new BundlerInBrowser(fs);

  // setup event listeners

  bundler.events.on("initialized", () => log("initialized"));
  bundler.events.on("npm:progress", (e) => log(`[npm] [${e.stage}] [${e.current} / ${e.total}] ${e.packageId}`));
  bundler.events.on("npm:install:done", () => log(`[npm] install:done`));
  bundler.events.on("npm:install:error", (e) => log(`[npm] install:error`, e.errors));
  bundler.events.on("compile:start", () => log("compile:start"));
  bundler.events.on("compile:usercode", (result) => log("compile:usercode", result));
  bundler.events.on("compile:vendor", (result) => log("compile:vendor", result));

  bundler.events.on("npm:install:error", () => self.postMessage({ type: 'npm-progress', source: workerSourceMarker, event: 'error', progress: null } satisfies NPMProgressMessage));
  bundler.events.on("npm:install:done", () => self.postMessage({ type: 'npm-progress', source: workerSourceMarker, event: 'done', progress: null } satisfies NPMProgressMessage));
  bundler.events.on("npm:progress", (e) => self.postMessage({ type: 'npm-progress', source: workerSourceMarker, event: 'progress', progress: e } satisfies NPMProgressMessage));

  // initialize

  await bundler.initialize({
    esbuildWasmURL: esbuildWasmURL,
  });
  await installSassPlugin(bundler);
  await installVuePlugin(bundler, { enableProdDevTools: true });
  await installTailwindPlugin(bundler, {
    // tailwindConfig: "/tailwind.config.js",
    tailwindConfig: {
      corePlugins: {
        // preflight: false,  // remove Tailwind's reset
      }
    }
  });

  // ready to compile
  self.addEventListener("message", async ({ data }) => {
    if (!isCompilationRequest(data)) return;
    fs.fromJSON(data.files);

    await bundler
      .compile({

      })
      .then((result) => {
        const message: CompilationSuccessResponse = {
          result,
          wrappedJs: wrapCommonJS(result.js),
        };
        data.port.postMessage(message);
        log("compile:done", result);
      })
      .catch((err: Error & { errors?: (PartialMessage | Error)[] }) => {
        data.port.postMessage({ errors: err.errors || [err] });

        log(`compile:error ${err}`);
        // if (err.errors?.length) {
        //   err.errors.forEach((error, index, errors) => {
        //     let msg = 'text' in error ? error.text : String(error);
        //     let pos = 'location' in error && error.location ? ` (${error.location.file}:${error.location.line}:${error.location.column})` : '';
        //     log(`compile:error ${index + 1}/${errors.length}`, msg, pos);
        //   })
        // } else {
        //   log(err);
        // }
      });

    data.port.close();
  });
  self.postMessage(newWorkerReadyMessage());
}

function log(...args: any[]) {
  console.log(`[worker] ${dayjs().format("HH:mm:ss")} |`, ...args);

  const message: WorkerLogMessage = {
    type: "log",
    source: workerSourceMarker,
    timestamp: Date.now(),
    level: "info",
    message: args.join(" "),
  };
  self.postMessage(message);
}
