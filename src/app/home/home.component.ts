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
  selectedLangLogo: string = '';
  files: Array<{ name: string; ext: string; content: string }> = [];
  selectedFileIndex: number = 0;
  minimizedTerminal: boolean = false;
  activeIcon: string = 'Files';

  constructor(private runner: RunnerService) { }

  toggleMinimizeTerminal() {
    this.minimizedTerminal = !this.minimizedTerminal;
  }

  setActiveIcon(name: string) {
    this.activeIcon = name;
  }

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any = null;

  isLoading = false;
  runtimeStatus: string = 'idle';
  languages: any = [
    { id: 1, name: 'Python', logo: 'assets/UI Design/python.svg', ext: 'py' },
    { id: 2, name: 'JavaScript', logo: 'assets/UI Design/JS.svg', ext: 'js' }
  ];
  sourceCode: any
  input: any = null
  output: any
  langId: any = 1
  isDark: boolean = false;
  lineNumbers: number[] = Array.from({length: 40}, (_, i) => i + 1);
  activeTab: string = 'Output';
  consoleLines: Array<{ text: string; type?: string }> = [];
  lastRunAgo: string = '12s ago';

  ngOnInit(): void {
    // Subscribe to pyodide status to show runtime readiness in UI
    this.runner.pyStatus$.subscribe(st => {
      if (st.status === 'ready') this.runtimeStatus = 'ready';
      else if (st.status === 'loading') this.runtimeStatus = 'loading: ' + (st.message || '');
      else if (st.status === 'error') this.runtimeStatus = 'error: ' + (st.message || '');
    });
    this.initFiles();
    this.updateLangLogo();
  }

  initFiles() {
    const lang = this.languages.find((l: any) => l.id == this.langId);
    this.files = [{ name: 'main', ext: lang?.ext || 'py', content: '' }];
    this.selectedFileIndex = 0;
  }

  onLangChange() {
    this.initFiles();
    this.updateLangLogo();
    setTimeout(() => this.updateEditorLanguage(), 100);
  }

  updateLangLogo() {
    const lang = this.languages.find((l: any) => l.id == this.langId);
    this.selectedLangLogo = lang?.logo || '';
  }

  updateEditorLanguage() {
    if (this.editor) {
      const lang = this.languages.find((l: any) => l.id == this.langId);
      this.editor.setValue(this.files[this.selectedFileIndex]?.content || '');
      this.editor.updateOptions({ language: lang?.ext === 'py' ? 'python' : 'javascript' });
    }
  }

  addFile() {
    const lang = this.languages.find((l: any) => l.id == this.langId);
    const newName = 'file' + (this.files.length + 1);
    this.files.push({ name: newName, ext: lang?.ext || 'py', content: '' });
    this.selectedFileIndex = this.files.length - 1;
    setTimeout(() => this.updateEditorLanguage(), 100);
  }

  removeFile(idx: number) {
    if (this.files.length > 1) {
      this.files.splice(idx, 1);
      if (this.selectedFileIndex >= this.files.length) {
        this.selectedFileIndex = this.files.length - 1;
      }
      setTimeout(() => this.updateEditorLanguage(), 100);
    }
  }

  selectFile(idx: number) {
    this.selectedFileIndex = idx;
    setTimeout(() => this.updateEditorLanguage(), 100);
  }
  async ngAfterViewInit() {
    // dynamically import monaco to avoid build-time issues if not installed yet
    try {
      const monaco = await import('monaco-editor');
      const initial = this.files[this.selectedFileIndex]?.content || '';
      const lang = this.languages.find((l: any) => l.id == this.langId);
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: initial,
        language: lang?.ext === 'py' ? 'python' : 'javascript',
        theme: this.isDark ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontFamily: 'Fira Code, Menlo, monospace',
        fontSize: 23,
      });
      this.editor.onDidChangeModelContent(() => {
        this.files[this.selectedFileIndex].content = this.editor.getValue();
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

  async executeClicked() {
    this.addConsoleLine('▶ Execution started...', 'ok');
    // Get code from selected file
    const code = this.files[this.selectedFileIndex]?.content || '';
    let selectedLangName = null;
    if (this.languages && Array.isArray(this.languages)) {
      const found = this.languages.find((l: any) => l.id == this.langId);
      if (found) selectedLangName = found.name;
    }
    if (!selectedLangName) {
      this.addConsoleLine('Please select a language', 'warn');
      return;
    }
    // Interactive terminal input handling for Python input()
    if (selectedLangName.toLowerCase() === 'python' && code.includes('input(')) {
      // Find all input() calls and prompt user for each
      const inputRegex = /input\s*\(([^)]*)\)/g;
      let match;
      let inputs: string[] = [];
      while ((match = inputRegex.exec(code)) !== null) {
        let promptText = match[1] ? match[1].replace(/['"`]/g, '') : 'Input required:';
        // Show prompt in terminal and get value
        const value = await this.promptTerminalInput(promptText);
        inputs.push(value);
      }
      // Replace input() calls with provided values
      let codeWithInputs = code;
      let i = 0;
      codeWithInputs = codeWithInputs.replace(inputRegex, () => JSON.stringify(inputs[i++]));
      this.runTerminalCode(selectedLangName, codeWithInputs);
    } else {
      this.runTerminalCode(selectedLangName, code);
    }
  }

  runTerminalCode(selectedLang: string, code: string) {
    this.isLoading = true;
    this.output = null;
    this.runner.runCode(selectedLang, code, this.input || '')
      .then(res => {
        this.output = res.stdout && res.stdout.length ? res.stdout : res.stderr;
        this.addConsoleLine(this.output, res.stdout ? 'ok' : 'warn');
        this.isLoading = false;
      })
      .catch(err => {
        this.addConsoleLine(String(err), 'warn');
        this.isLoading = false;
      });
  }

  promptTerminalInput(promptText: string): Promise<string> {
    return new Promise(resolve => {
      // Add prompt to terminal
      this.addConsoleLine(promptText, 'warn');
      // Create a temporary input box in the terminal
      const inputId = 'terminal-input-' + Math.random().toString(36).substr(2, 9);
      setTimeout(() => {
        const consoleElem = document.getElementById('console');
        if (consoleElem) {
          const inputElem = document.createElement('input');
          inputElem.type = 'text';
          inputElem.id = inputId;
          inputElem.className = 'terminal-input-box';
          inputElem.placeholder = promptText;
          inputElem.style.margin = '8px 0';
          inputElem.style.padding = '6px 12px';
          inputElem.style.fontSize = '18px';
          inputElem.style.borderRadius = '6px';
          inputElem.style.border = '1px solid #ff7a2d';
          inputElem.style.background = '#222';
          inputElem.style.color = '#fff';
          inputElem.style.width = '80%';
          inputElem.onkeydown = (e: any) => {
            if (e.key === 'Enter') {
              resolve(inputElem.value);
              inputElem.remove();
              this.addConsoleLine('> ' + inputElem.value, 'ok');
            }
          };
          consoleElem.appendChild(inputElem);
          inputElem.focus();
        } else {
          // fallback prompt
          const value = window.prompt(promptText) || '';
          resolve(value);
          this.addConsoleLine('> ' + value, 'ok');
        }
      }, 100);
    });
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
