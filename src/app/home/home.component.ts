import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { RunnerService } from '../runner.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  activeIcon: string = 'Files';

  constructor(private runner: RunnerService) { }

  setActiveIcon(name: string) {
    this.activeIcon = name;
  }

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any = null;

  isLoading = false;
  runtimeStatus: string = 'idle';
  languages: any = [
    { id: 1, name: 'Python' },
    { id: 2, name: 'JavaScript' }
  ];
  sourceCode: any
  input: any = null
  output: any
  langId: any = 1
  isDark: boolean = false;
  lineNumbers: number[] = Array.from({length: 40}, (_, i) => i + 1);
  activeTab: string = 'Output';
  consoleLines: Array<{ text: string; type?: string }> = [
    { text: 'Success! Success! Ao daltted', type: 'ok' },
    { text: 'Success! Success! hello!', type: 'ok' },
    { text: 'Terminal has seed to note succesf1!', type: 'warn' },
  ];
  lastRunAgo: string = '12s ago';

  ngOnInit(): void {
    // Subscribe to pyodide status to show runtime readiness in UI
    this.runner.pyStatus$.subscribe(st => {
      if (st.status === 'ready') this.runtimeStatus = 'ready';
      else if (st.status === 'loading') this.runtimeStatus = 'loading: ' + (st.message || '');
      else if (st.status === 'error') this.runtimeStatus = 'error: ' + (st.message || '');
    });
  }
  async ngAfterViewInit() {
    // dynamically import monaco to avoid build-time issues if not installed yet
    try {
      const monaco = await import('monaco-editor');
      const initial = this.sourceCode || `print(\"Hello from RunX\")`;
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: initial,
        language: this.langId === 1 ? 'python' : 'javascript',
        theme: this.isDark ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontFamily: 'Fira Code, Menlo, monospace',
        fontSize: 23,
      });
    } catch (err) {
      console.error('Monaco load failed', err);
    }
  }

  ngOnDestroy(): void {
    if (this.editor && this.editor.dispose) this.editor.dispose();
  }
  onRun() {
    this.isLoading = true;  
    this.output = null
    // Get selected language name
    let selectedLangName = null;
    if (this.languages && Array.isArray(this.languages)) {
      const found = this.languages.find((l: any) => l.id == this.langId);
      if (found) selectedLangName = found.name;
    }
    
    if (!selectedLangName) {
      this.output = 'Please select a language';
      this.isLoading = false;
      return;
    }

    // get code from Monaco if available
    const code = this.editor && this.editor.getValue ? this.editor.getValue() : (this.sourceCode || '');

    // Execute code using client-side runner
    this.runner.runCode(selectedLangName, code, this.input || '')
      .then(res => {
        // prefer stdout, fall back to stderr
        this.output = res.stdout && res.stdout.length ? res.stdout : res.stderr;
        this.isLoading = false;
      })
      .catch(err => {
        this.output = String(err);
        this.isLoading = false;
      });
  }

  toggleTheme() {
    this.isDark = !this.isDark;
  }

  executeClicked() {
    this.addConsoleLine('▶ Execution started...', 'ok');
    this.onRun();
    const now = new Date();
    this.lastRunAgo = 'just now';
  }

  selectTab(name: string) {
    this.activeTab = name;
  }

  addConsoleLine(text: string, type: string = 'ok') {
    this.consoleLines.push({ text, type });
    // keep scroll behavior to UI; Angular will update the DOM
  }

  clearConsole() {
    this.consoleLines = [];
  }

  downloadOutput() {
    const blob = new Blob([String(this.output || '')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
