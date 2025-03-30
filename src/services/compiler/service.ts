import { ref as atom, Ref } from "vue";
import {
  isNPMProgressMessage,
  isWorkerLogMessage,
  isWorkerReadyMessage,
  workerSourceMarker,
  type CompilationRequest,
  type CompilationResponse,
  type CompilationSuccessResponse,
  type WorkerLogMessage,
} from "./common";
import { makePromise } from "yon-utils";
import { BundlerInBrowser, MiniNPM } from "bundler-in-browser";

function setAtom<T>(atom: Ref<T>, value: T) {
  atom.value = value;
}

function getAtom<T>(atom: Ref<T>): T {
  return atom.value;
}

/**
 * Service class handling compilation operations using Web Workers
 * Manages the compilation process and maintains the worker's state
 */
export class CompilerService {
  /** Web Worker instance for handling compilation tasks */
  private worker?: Worker;
  private workerLoadingPromise?: Promise<void>;

  /** Jotai store instance for state management */
  isReadyAtom = atom(false);
  isCompilingAtom = atom(false);
  npmInstallProgressAtom = atom<MiniNPM.ProgressEvent | null>(null); // only while npm installing
  logsAtom = atom<WorkerLogMessage[]>([]);
  resultAtom = atom<CompilationSuccessResponse | null>(null); // last successful compilation result
  errorsAtom = atom<any[]>([]); // last compilation errors

  /**
   * Initializes the CompilerService and sets up the worker
   */
  constructor() {
    this.resetWorker(); // initialize the worker for the first time
  }

  /**
   * Resets the worker instance and initializes a new one
   * @returns Promise that resolves when the worker is ready
   */
  async resetWorker() {
    this.worker?.terminate();
    this.worker = undefined;

    const worker = new Worker(new URL('./compiler.worker.ts', import.meta.url));

    setAtom(this.isReadyAtom, false);
    setAtom(this.isCompilingAtom, false);
    this.worker = worker;

    const promise = makePromise<void>();
    worker.addEventListener("message", (e) => {
      if (isWorkerReadyMessage(e.data)) {
        const error = e.data.error;
        if (!error) promise.resolve();
        else {
          promise.reject(error);
          if (this.worker === worker) this.worker = undefined;
          setAtom(this.isReadyAtom, false);
          worker.terminate();
        }
        return;
      }

      if (isWorkerLogMessage(e.data)) {
        setAtom(
          this.logsAtom,
          getAtom(this.logsAtom).concat(e.data).slice(-500)
        );
        return;
      }

      if (isNPMProgressMessage(e.data)) {
        setAtom(this.npmInstallProgressAtom, e.data.progress);
      }
    });

    this.workerLoadingPromise = promise;
    await promise;

    if (worker === this.worker) setAtom(this.isReadyAtom, true);
  }

  clearLogs() {
    setAtom(this.logsAtom, []);
  }

  /**
   * Compiles the provided source files using the worker
   * @param {Object} files - Key-value pairs of file paths and their contents
   * @param {string} files[path] - Content of the file at the specified path
   */
  async compile(files: { [path: string]: string }) {
    const { port1, port2 } = new MessageChannel();
    const message: CompilationRequest = {
      type: "compile",
      target: workerSourceMarker,
      files,
      port: port2,
    };

    if (!this.worker) await this.resetWorker();
    await this.workerLoadingPromise;

    // prevent multiple compilations
    if (getAtom(this.isCompilingAtom)) return;

    setAtom(this.isCompilingAtom, true);
    this.worker!.postMessage(message, [port2]);

    const data = await new Promise<CompilationResponse>((resolve) => {
      port1.onmessage = (e: MessageEvent<CompilationResponse>) => {
        resolve(e.data);
      };
    });

    setAtom(this.isCompilingAtom, false);
    if ("result" in data) {
      setAtom(this.resultAtom, data);
      setAtom(this.errorsAtom, []);
    } else {
      setAtom(this.errorsAtom, data.errors);
    }
  }
}
