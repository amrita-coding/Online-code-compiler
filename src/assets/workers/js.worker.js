// Simple JS worker that executes JavaScript code and captures console output
self.onmessage = function (e) {
  const msg = e.data || {};
  if (msg.type === 'run') {
    const code = msg.code || '';
    const input = msg.stdin || '';
    let output = '';
    let error = '';
    // capture console.log
    const oldLog = console.log;
    const oldError = console.error;
    console.log = function () {
      const args = Array.from(arguments).map(a => {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }).join(' ');
      output += args + '\n';
    };
    console.error = function () {
      const args = Array.from(arguments).map(a => {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }).join(' ');
      error += args + '\n';
    };
    try {
      // provide a basic `stdin` variable for code to access
      const fn = new Function('stdin', code);
      const res = fn(input);
      if (res !== undefined) {
        try { output += JSON.stringify(res) + '\n'; } catch { output += String(res) + '\n'; }
      }
    } catch (err) {
      error += err.toString() + '\n';
    }
    // restore console
    console.log = oldLog;
    console.error = oldError;
    self.postMessage({ type: 'result', stdout: output, stderr: error });
  }
};
