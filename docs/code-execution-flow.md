
# Online Code Compiler - Execution Flow

## Overview

This project runs code for JavaScript, Python, and C/C++ entirely in the browser using Web Workers. The main execution flow is:

1. `HomeComponent` sends code to `RunnerService`.
2. `RunnerService` routes the code to the correct language worker.
3. The worker executes the code in isolation and posts back the result.
4. The UI displays the output in the built-in terminal.

## Main entry point

File: `src/app/runner.service.ts`

`RunnerService` is the central runtime router.

- It creates language workers from `src/assets/workers/`.
- It exposes `runCode(languageName, code, stdin)`.
- It decides which backend to use:
  - Python: `runPython(code, stdin)`
  - JavaScript: `runJavaScript(code, stdin)`
  - C/C++: `runCCPP(code, stdin)`
- It listens for `message` events from workers and resolves promises.
- It also exposes `ccppOutput$` for live C/C++ stdout/stderr streaming.

## UI integration

File: `src/app/home/home.component.ts`

- The UI uses `RunnerService` to execute code.
- `runTerminalCode()` calls `this.runner.runCode(...)`.
- The result promise updates `this.output` and writes to the terminal.
- For C/C++, the component subscribes to `runner.ccppOutput$` and writes incremental output lines immediately.

## JavaScript execution

File: `src/assets/workers/js.worker.js`

Flow:

1. Worker receives a message `{ type: 'run', code, stdin }`.
2. It overrides `console.log` and `console.error` to capture text.
3. It creates a function from the source with `new Function('stdin', code)`.
4. It executes the function with the supplied `stdin` string.
5. If the function returns a value, it appends that value to captured stdout.
6. It restores the original console methods.
7. It posts back `{ type: 'result', stdout, stderr }`.

Characteristics:

- JavaScript execution is immediate and synchronous.
- It captures `console.log` output only.
- `stdin` is available as a function argument named `stdin`.

## Python execution

File: `src/assets/workers/pyodide.worker.js`

Flow:

1. Worker starts and loads Pyodide.
2. It tries local assets first (`/assets/pyodide/pyodide.js`).
3. If local loading fails, it falls back to CDN `https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js`.
4. It posts load status messages:
   - `{ type: 'loading', message }`
   - `{ type: 'ready' }`
   - `{ type: 'error', error }`
5. It defines a helper Python function `run_user_code(code, stdin)` inside Pyodide:
   - redirects `sys.stdin`, `sys.stdout`, and `sys.stderr`.
   - executes user code with `exec(code, {})`.
   - captures output and errors.
   - returns `(out, err)`.
6. On `{ type: 'run', code, stdin }`:
   - it calls `pyodide.runPythonAsync(...)`.
   - converts the returned PyProxy into JS values.
   - posts `{ type: 'result', stdout, stderr }`.

Characteristics:

- Python runs in a full Python runtime compiled to WebAssembly.
- `stdin` support is implemented by replacing `sys.stdin` with `io.StringIO`.
- Both stdout and stderr are captured and returned.

## C/C++ execution

File: `src/assets/workers/ccpp.worker.js`

Flow:

1. Worker is created as a module worker: `new Worker('/assets/workers/ccpp.worker.js', { type: 'module' })`.
2. The worker patches global `console.log`, `console.error`, `console.warn`, `console.info`, and `console.debug` before importing clang.js.
3. It imports `init` and `run` from `https://cdn.jsdelivr.net/npm/clang.js/dist/clang.js`.
4. `ensureClangReady()` initializes clang.js once:
   - calls `init({ path: 'https://cdn.jsdelivr.net/npm/clang.js/dist' })`.
   - caches readiness across calls.
5. When it receives `{ type: 'run', code, stdin }`:
   - normalizes line endings.
   - clears output buffers.
   - enables `globalCaptureActive = true`.
   - calls `await run(code)`.
6. During `run(code)`, the patched console intercepts output:
   - sends live messages `{ type: 'stdout', text }` and `{ type: 'stderr', text }`.
   - filters compiler noise so only program output is forwarded.
7. After execution, the worker waits until output quiets for up to 12 seconds or a max of 60 seconds.
8. It finally posts `{ type: 'result', stdout, stderr }`.

Characteristics:

- C/C++ uses clang.js in the browser to compile and execute the code.
- Actual program output is captured by wrapping the worker global console.
- The worker filters out clang/ld build logs to avoid showing compile internals.
- C/C++ output is streamed live through `ccppOutput$` and also delivered as a final `result`.

## How routing works

File: `src/app/runner.service.ts`

- `runCode(languageName, code, stdin)` detects the language by string matching:
  - `python` → Python worker
  - `javascript`, `js`, `node` → JS worker
  - `c`, `c++`, `cpp` → C/C++ worker
- Each helper returns a promise that resolves when the worker posts its final `result`.
- For C/C++, the worker additionally sends intermediate `stdout`/`stderr` messages.

## Files and responsibilities

- `src/app/runner.service.ts` — runtime selection, worker lifecycle, worker messaging.
- `src/assets/workers/js.worker.js` — JavaScript execution worker.
- `src/assets/workers/pyodide.worker.js` — Python execution worker using Pyodide.
- `src/assets/workers/ccpp.worker.js` — C/C++ execution worker using clang.js.
- `src/app/home/home.component.ts` — UI code that sends code to the runner and displays output.

## Notes and limitations

- The app runs languages entirely on the client; no backend compilation is used for JS/Python/C/C++.
- C/C++ `scanf`/stdin support is not fully implemented in this worker flow.
- JavaScript `stdin` is available as a function argument only.
- Python stdin is simulated by replacing `sys.stdin` with a string buffer.
- C/C++ runtime currently relies on the console interception method, which works for output but does not provide a native POSIX stdin implementation.

## Recommended next reading

- `src/app/runner.service.ts` to understand routing and worker setup.
- `src/assets/workers/ccpp.worker.js` to understand browser-based C/C++ compilation.
- `src/assets/workers/pyodide.worker.js` for Python runtime loading and I/O capture.
- `src/assets/workers/js.worker.js` for the simplest JavaScript executor.
