// C/C++ Runtime - Browser-based Clang.js compiler/wrapper

// This worker uses clang.js in the browser to compile C/C++ source to WebAssembly
// and execute it in a real compilation environment.

// Helper functions (must be defined before console interception)
const filterPatterns = [
  /^clang\b/, 
  /^wasm-ld\b/, 
  /^fetching and compiling\b/i,
  /^compiling\b/i,
  /^done\.$/i,
  /^\d+\.(o|wasm)$/, 
  /^>\s*/, 
  /^rAF\b/, 
];

function stripAnsiCodes(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function normalizeLogLine(text) {
  return stripAnsiCodes(text).replace(/^[>\s]+/, '').trim();
}

function isCompilerLog(text) {
  const normalized = normalizeLogLine(text);
  return normalized.length === 0 || filterPatterns.some(pattern => pattern.test(normalized));
}

// Store original console methods BEFORE importing clang.js
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

// Global buffers for output capture
let stdoutLines = [];
let stderrLines = [];
let globalCaptureActive = false;
let programOutputReceived = false;

// Global wrapper functions that will intercept clang.js output
const globalCaptureLog = (...args) => {
  const text = args.map(arg => String(arg)).join(' ');
  const filtered = isCompilerLog(text);
  if (globalCaptureActive && !filtered) {
    const cleanText = stripAnsiCodes(text);
    stdoutLines.push(cleanText);
    resetDoneTimer();
    self.postMessage({ type: 'stdout', text: cleanText });
    originalConsoleLog('[GLOBAL-CAPTURE-LOG]', text);
  } else if (globalCaptureActive && filtered) {
    originalConsoleLog('[GLOBAL-CAPTURE-FILTERED]', text);
  }
  originalConsoleLog(...args);
};

const globalCaptureError = (...args) => {
  const text = args.map(arg => String(arg)).join(' ');
  const filtered = isCompilerLog(text);
  if (globalCaptureActive && !filtered) {
    const cleanText = stripAnsiCodes(text);
    stderrLines.push(cleanText);
    resetDoneTimer();
    self.postMessage({ type: 'stderr', text: cleanText });
    originalConsoleLog('[GLOBAL-CAPTURE-ERROR]', text);
  } else if (globalCaptureActive && filtered) {
    originalConsoleLog('[GLOBAL-CAPTURE-FILTERED-ERR]', text);
  }
  originalConsoleError(...args);
};

// Patch console globally BEFORE clang.js is imported
console.log = globalCaptureLog;
console.error = globalCaptureError;
console.warn = globalCaptureError;
console.info = globalCaptureLog;
console.debug = globalCaptureLog;


import { init, run } from 'https://cdn.jsdelivr.net/npm/clang.js/dist/clang.js';


let clangReady = false;
let clangInitPromise = null;
let clangInitError = null;

function normalizeCode(code) {
  return code.replace(/\r\n/g, '\n');
}

async function ensureClangReady() {
  if (clangReady) {
    return;
  }
  if (clangInitError) {
    throw clangInitError;
  }
  if (!clangInitPromise) {
    clangInitPromise = init({
      path: 'https://cdn.jsdelivr.net/npm/clang.js/dist',
    }).then(() => {
      clangReady = true;
    }).catch(err => {
      clangInitError = err;
      throw err;
    });
  }
  return clangInitPromise;
}

const CAPTURE_IDLE_MS = 12000;
const CAPTURE_MAX_MS = 60000;
let doneTimer = null;
let maxTimer = null;
let finished = false;

function clearTimers() {
  if (doneTimer) {
    clearTimeout(doneTimer);
    doneTimer = null;
  }
  if (maxTimer) {
    clearTimeout(maxTimer);
    maxTimer = null;
  }
}

function resetDoneTimer() {
  clearTimers();
  doneTimer = setTimeout(() => {
    finishCapture();
  }, CAPTURE_IDLE_MS);
  maxTimer = setTimeout(() => {
    finishCapture();
  }, CAPTURE_MAX_MS);
}

function finishCapture() {
  if (finished) {
    return;
  }
  finished = true;
  clearTimers();
  globalCaptureActive = false;
  
  originalConsoleLog('[WORKER] finishCapture() called. Captured stdout lines:', stdoutLines.length, 'stderr lines:', stderrLines.length);
  originalConsoleLog('[WORKER] stdout content:', stdoutLines.join('\n').substring(0, 200));
  originalConsoleLog('[WORKER] Posting result to main thread...');
  
  self.postMessage({
    type: 'result',
    stdout: stdoutLines.join('\n'),
    stderr: stderrLines.join('\n')
  });
}

self.onmessage = async function (event) {
  const msg = event.data || {};
  if (msg.type !== 'run') {
    return;
  }

  try {
    await ensureClangReady();
  } catch (err) {
    self.postMessage({
      type: 'result',
      stdout: '',
      stderr: 'C/C++ compiler initialization failed: ' + (err?.message || String(err))
    });
    return;
  }

  const code = normalizeCode(msg.code || '');
  stdoutLines = [];
  stderrLines = [];
  finished = false;
  globalCaptureActive = true;

  originalConsoleLog('[WORKER] Starting C/C++ execution...');

  try {
    const result = await run(code);
    originalConsoleLog('[WORKER] run() completed, result:', result);
  } catch (err) {
    originalConsoleLog('[WORKER] run() error:', err?.message);
    stderrLines.push(err?.message || String(err));
  }

  originalConsoleLog('[WORKER] run() finished, waiting for output via timer...');
  
  // Start the timer to wait for output to arrive and finalize when quiet
  resetDoneTimer();
};
