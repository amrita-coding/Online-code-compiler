// Pyodide worker (vanilla JS) - loads pyodide and runs Python code
self.isReady = false;
let pyodide = null;

async function loadPyodideAndPackages() {
  try {
    // announce loading
    self.postMessage({ type: 'loading', message: 'attempting local load' });
    // Try local-hosted pyodide first (you should copy the `full/` folder into `src/assets/pyodide/`)
    try {
      importScripts('/assets/pyodide/pyodide.js');
      pyodide = await loadPyodide({ indexURL: '/assets/pyodide/' });
      self.postMessage({ type: 'loading', message: 'loaded pyodide from local assets' });
    } catch (localErr) {
      // fallback to CDN
      self.postMessage({ type: 'loading', message: 'local load failed, falling back to CDN' });
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
      pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/' });
      self.postMessage({ type: 'loading', message: 'loaded pyodide from CDN' });
    }
    // define a helper in the python runtime to execute code and capture output
    await pyodide.runPythonAsync(`
import sys, io, traceback
def run_user_code(code, stdin):
    old_stdin = sys.stdin
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdin = io.StringIO(stdin)
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    try:
        exec(code, {})
    except Exception:
        traceback.print_exc()
    out = sys.stdout.getvalue()
    err = sys.stderr.getvalue()
    sys.stdin = old_stdin
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    return out, err
    `);
    self.isReady = true;
    self.postMessage({ type: 'ready' });
  } catch (e) {
    self.postMessage({ type: 'error', error: e.toString() });
  }
}

loadPyodideAndPackages();

self.onmessage = async (e) => {
  const msg = e.data || {};
  if (msg && msg.type === 'run') {
    if (!self.isReady) {
      self.postMessage({ type: 'result', stdout: '', stderr: 'Pyodide not ready' });
      return;
    }
    const code = msg.code || '';
    const stdin = msg.stdin || '';
    try {
      // call the helper and convert result to JS
      const res = await pyodide.runPythonAsync(`run_user_code(${JSON.stringify(code)}, ${JSON.stringify(stdin)})`);
      let out = '';
      let err = '';
      try {
        // If res is a PyProxy, try to convert
        if (res && typeof res.toJs === 'function') {
          const jsres = res.toJs();
          out = jsres[0] !== undefined ? jsres[0] : '';
          err = jsres[1] !== undefined ? jsres[1] : '';
        } else if (Array.isArray(res)) {
          out = res[0] || '';
          err = res[1] || '';
        } else {
          out = String(res);
        }
      } catch (convErr) {
        out = String(res);
      }
      self.postMessage({ type: 'result', stdout: out, stderr: err });
    } catch (runErr) {
      self.postMessage({ type: 'result', stdout: '', stderr: runErr.toString() });
    }
  }
};
