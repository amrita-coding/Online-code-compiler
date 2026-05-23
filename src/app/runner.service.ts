import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RunnerService {
  pyWorker: Worker | null = null;
  jsWorker: Worker | null = null;
  ccppWorker: Worker | null = null;
  ccppOutput$ = new Subject<{ type: 'stdout' | 'stderr'; text: string }>();
  // observable to know when pyodide runtime is ready or loading
  pyStatus$ = new Subject<{ status: 'idle'|'loading'|'ready'|'error', message?: string }>();

  constructor() {
    // instantiate workers from assets so bundler doesn't need special config
    try {
      this.pyWorker = new Worker('/assets/workers/pyodide.worker.js');
      // listen for ready/loading messages
      this.pyWorker.addEventListener('message', (ev: MessageEvent) => {
        const msg = ev.data || {};
        if (msg.type === 'ready') this.pyStatus$.next({ status: 'ready' });
        else if (msg.type === 'loading') this.pyStatus$.next({ status: 'loading', message: msg.message });
        else if (msg.type === 'error') this.pyStatus$.next({ status: 'error', message: msg.error });
      });
    } catch (e) {
      this.pyWorker = null;
      console.warn('Could not create Pyodide worker', e);
    }
    try {
      this.jsWorker = new Worker('/assets/workers/js.worker.js');
    } catch (e) {
      this.jsWorker = null;
      console.warn('Could not create JS worker', e);
    }
    try {
      this.ccppWorker = new Worker('/assets/workers/ccpp.worker.js', { type: 'module' });
      if (this.ccppWorker) {
        this.ccppWorker.addEventListener('message', (ev: MessageEvent) => {
          const msg = ev.data || {};
          if (msg.type === 'stdout') {
            this.ccppOutput$.next({ type: 'stdout', text: msg.text });
          } else if (msg.type === 'stderr') {
            this.ccppOutput$.next({ type: 'stderr', text: msg.text });
          }
        });
      }
    } catch (e) {
      this.ccppWorker = null;
      console.warn('Could not create C/C++ worker', e);
    }
  }

  runPython(code: string, stdin = ''): Promise<{ stdout: string; stderr: string }>{
    return new Promise((resolve) => {
      if (!this.pyWorker) {
        resolve({ stdout: '', stderr: 'Python runtime unavailable' });
        return;
      }
      const onMessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        if (msg.type === 'result') {
          this.pyWorker!.removeEventListener('message', onMessage);
          resolve({ stdout: msg.stdout || '', stderr: msg.stderr || '' });
        } else if (msg.type === 'error') {
          this.pyWorker!.removeEventListener('message', onMessage);
          resolve({ stdout: '', stderr: msg.error || 'unknown error' });
        }
      };
      this.pyWorker.addEventListener('message', onMessage);
      this.pyWorker.postMessage({ type: 'run', code, stdin });
    });
  }

  runJavaScript(code: string, stdin = ''): Promise<{ stdout: string; stderr: string }>{
    return new Promise((resolve) => {
      if (!this.jsWorker) {
        resolve({ stdout: '', stderr: 'JS runtime unavailable' });
        return;
      }
      const onMessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        if (msg.type === 'result') {
          this.jsWorker!.removeEventListener('message', onMessage);
          resolve({ stdout: msg.stdout || '', stderr: msg.stderr || '' });
        }
      };
      this.jsWorker.addEventListener('message', onMessage);
      this.jsWorker.postMessage({ type: 'run', code, stdin });
    });
  }

  runCCPP(code: string, stdin = ''): Promise<{ stdout: string; stderr: string }>{
    return new Promise((resolve) => {
      if (!this.ccppWorker) {
        resolve({ stdout: '', stderr: 'C/C++ runtime unavailable' });
        return;
      }
      const onMessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        if (msg.type === 'result') {
          this.ccppWorker!.removeEventListener('message', onMessage);
          resolve({ stdout: msg.stdout || '', stderr: msg.stderr || '' });
        }
      };
      this.ccppWorker.addEventListener('message', onMessage);
      this.ccppWorker.postMessage({ type: 'run', code, stdin });
    });
  }

  runCode(languageName: string, code: string, stdin = ''): Promise<{ stdout: string; stderr: string }>{
    const lang = (languageName || '').toLowerCase();
    if (lang.includes('python')) {
      return this.runPython(code, stdin);
    }
    if (lang.includes('javascript') || lang.includes('js') || lang.includes('node')) {
      return this.runJavaScript(code, stdin);
    }
    if (lang.includes('c') || lang.includes('c++') || lang.includes('cpp')) {
      return this.runCCPP(code, stdin);
    }
    return Promise.resolve({ stdout: '', stderr: `Language not supported on client: ${languageName}` });
  }
}
