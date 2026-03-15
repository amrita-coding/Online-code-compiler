import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { RunnerService } from '../runner.service';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


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
  isLoggedIn: boolean = false; // toggles between logout and user icon

  // Auth modal state and form models
  showAuthModal: boolean = false;
  authMode: 'login' | 'signup' = 'login';
  // login form
  loginEmail: string = '';
  loginPassword: string = '';
  // signup form
  signupName: string = '';
  signupEmail: string = '';
  signupPassword: string = '';
  authError: string = '';
  isAuthLoading: boolean = false;

  constructor(private runner: RunnerService, private authService: AuthService, private http: HttpClient) { }

  toggleMinimizeTerminal() {
    this.minimizedTerminal = !this.minimizedTerminal;
  }

  setActiveIcon(name: string) {
    this.activeIcon = name;
    if (name === 'Directory' && this.isLoggedIn) {
      this.loadSavedCodes();
    }

    if (name === 'Directory' && this.editor) {
      this.editor.dispose();
      this.editor = null;
    }

    // When returning to the editor from the directory view, ensure the Monaco editor is visible/updated.
    if (name === 'Files') {
      setTimeout(async () => {
        if (!this.editor) {
          await this.initMonacoEditor();
        } else {
          // Ensure editor layout updates and focus is restored.
          this.updateEditorLanguage();
          this.editor.layout();
          this.editor.focus();
        }
      }, 10);
    }
  }

  logout() {
    // Call backend logout so the token can be blacklisted.
    // AuthService.logout will also clear client-side session/state and redirect.
    this.authService.logout().subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.savedCodes = [];
        this.setActiveIcon('Files');
        this.addConsoleLine('Logged out', 'warn');
      },
      error: (err) => {
        // If logout fails, we still clear the UI state.
        this.isLoggedIn = false;
        this.savedCodes = [];
        this.setActiveIcon('Files');
        this.addConsoleLine('Logged out (offline)', 'warn');
        console.warn('Logout failed', err);
      }
    });
  }

  shareCode() {
    const code = this.editor && this.editor.getValue ? this.editor.getValue() : (this.files[this.selectedFileIndex]?.content || '');
    const language = this.languages.find((l: any) => l.id == this.langId)?.name || 'Python';

    const token = localStorage.getItem('token');
    if (token) {
      this.http.post<{ id: string }>('http://localhost:8080/api/code/share', { code, language }, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          const shareUrl = `${window.location.origin}/?share=${response.id}`;
          navigator.clipboard.writeText(shareUrl).then(() => {
            this.addConsoleLine('Share link copied to clipboard!', 'ok');
          }).catch(() => {
            this.addConsoleLine(`Share URL: ${shareUrl}`, 'ok');
          });
        },
        error: (err) => {
          this.addConsoleLine('Failed to share code', 'warn');
          console.error('Share error', err);
        }
      });
    } else {
      this.addConsoleLine('Please log in to share code', 'warn');
    }
  }

  loadSharedCode(id: string) {
    this.http.get<{ code: string; language: string }>(`http://localhost:8080/api/code/${id}`).subscribe({
      next: (response) => {
        // Set the language
        const lang = this.languages.find((l: any) => l.name.toLowerCase() === response.language.toLowerCase());
        if (lang) {
          this.langId = lang.id;
          this.updateLangLogo();
        }
        // Set the code
        this.files[this.selectedFileIndex].content = response.code;
        if (this.editor) {
          this.editor.setValue(response.code);
          this.updateEditorLanguage();
        }
        this.addConsoleLine('Shared code loaded', 'ok');
      },
      error: (err) => {
        this.addConsoleLine('Failed to load shared code', 'warn');
        console.error('Load shared code error', err);
      }
    });
  }

  // Open auth modal (login or signup)
  openAuth(mode: 'login' | 'signup' = 'login') {
    this.authMode = mode;
    this.authError = '';
    this.showAuthModal = true;
  }

  closeAuth() {
    this.showAuthModal = false;
    this.authError = '';
    // clear form fields
    this.loginEmail = this.loginPassword = '';
    this.signupName = this.signupEmail = this.signupPassword = '';
  }

  submitLogin() {
    // basic validation
    this.authError = '';
    if (!this.loginEmail || !this.loginEmail.includes('@')) {
      this.authError = 'Please enter a valid email';
      return;
    }
    if (!this.loginPassword || this.loginPassword.length < 4) {
      this.authError = 'Password must be at least 4 characters';
      return;
    }
    this.isAuthLoading = true;
    this.authService.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: (resp) => {
        const response = resp.body as any;
        const token = resp.headers.get('Authorization');
        if (token) {
          localStorage.setItem('token', token);
        }
        const user = { email: response.email, name: response.username };
        localStorage.setItem('user', JSON.stringify(user));
        this.isLoggedIn = true;
        this.addConsoleLine('Logged in as ' + response.email, 'ok');
        this.loadSavedCodes();
        this.closeAuth();
        this.isAuthLoading = false;
      },
      error: (error) => {
        const errorMsg = error && error.error ? error.error : 'Login failed. Please try again.';
        this.authError = errorMsg;
        this.isAuthLoading = false;
      }
    });
  }

  submitSignup() {
    this.authError = '';
    this.isAuthLoading = true;

    if (!this.signupName || this.signupName.length < 2) {
      this.authError = 'Please enter your name';
      this.isAuthLoading = false;
      return;
    }
    if (!this.signupEmail || !this.signupEmail.includes('@')) {
      this.authError = 'Please enter a valid email';
      this.isAuthLoading = false;
      return;
    }
    if (!this.signupPassword || this.signupPassword.length < 6) {
      this.authError = 'Password must be at least 6 characters';
      this.isAuthLoading = false;
      return;
    }

    // Call the API to register
    this.authService.register({
      username: this.signupName,
      email: this.signupEmail,
      password: this.signupPassword
    }).subscribe({
      next: (response) => {
        const user = { email: response.email, name: response.username };
        localStorage.setItem('user', JSON.stringify(user));
        this.isLoggedIn = true;
        this.addConsoleLine('Account created & logged in as ' + response.email, 'ok');
        this.loadSavedCodes();
        this.closeAuth();
        this.isAuthLoading = false;
      },
      error: (error) => {
        const errorMsg = error.error || 'Registration failed. Please try again.';
        this.authError = errorMsg;
        this.isAuthLoading = false;
      }
    });
  }

  continueAsGuest() {
    this.isLoggedIn = false;
    this.addConsoleLine('Continuing as guest', 'warn');
    this.closeAuth();
  }

  @ViewChild('editorContainer', { static: false }) editorContainer!: ElementRef<HTMLDivElement>;
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
  savedCodes: any[] = [];

  ngOnInit(): void {
    // Subscribe to pyodide status to show runtime readiness in UI
    this.runner.pyStatus$.subscribe(st => {
      if (st.status === 'ready') this.runtimeStatus = 'ready';
      else if (st.status === 'loading') this.runtimeStatus = 'loading: ' + (st.message || '');
      else if (st.status === 'error') this.runtimeStatus = 'error: ' + (st.message || '');
    });
    this.initFiles();
    this.updateLangLogo();

    // Check for shared code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      this.loadSharedCode(shareId);
    }

    // Restore user session if present (do not auto-open auth modal)
    this.isLoggedIn = this.authService.isLoggedIn() || !!localStorage.getItem('user');
    if (this.isLoggedIn) {
      this.addConsoleLine('Welcome back, ' + this.userName, 'ok');
      this.loadSavedCodes();
    }
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
      this.editor.focus();
    }
  }

  addFile() {
    const lang = this.languages.find((l: any) => l.id == this.langId);
    const newName = 'Untitled' + (this.files.length + 1);
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
    setTimeout(() => {
      this.updateEditorLanguage();
    }, 100);
  }
  async ngAfterViewInit() {
    if (this.activeIcon === 'Files') {
      await this.initMonacoEditor();
    }
  }

  async initMonacoEditor() {
    // dynamically import monaco to avoid build-time issues if not installed yet
    if (!this.editorContainer) {
      console.error('Editor container not found');
      return;
    }
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
      // Focus the editor to show the cursor
      this.editor.focus();
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
    // If not authenticated, prompt login/signup
    // if (!this.isLoggedIn) {
    //   this.openAuth('login');
    //   return;
    // }
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
    // Get current program source (prefer editor, fall back to selected file or sourceCode)
    const program = this.editor && this.editor.getValue ? this.editor.getValue() : (this.files[this.selectedFileIndex]?.content || this.sourceCode || '');
    const fileBase = this.files[this.selectedFileIndex]?.name || 'program';
    const fileExt = this.files[this.selectedFileIndex]?.ext || (this.languages.find((l: any) => l.id == this.langId)?.ext || 'txt');

    // Build download text with headings and preserve original indentation of program
    const contentParts = [
      `Program: ${fileBase}.${fileExt}`,
      '--------------------',
      program,
      '',
      'Output:',
      '--------------------',
      String(this.output || '')
    ];
    const content = contentParts.join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileBase}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Convenience getter for user display name
  get userName() {
    try {
      const u = localStorage.getItem('user');
      if (!u) return '';
      const parsed = JSON.parse(u);
      return parsed.name || parsed.email || '';
    } catch (e) {
      return '';
    }
  }

  loadSavedCodes() {
    this.authService.getUserCodes().subscribe({
      next: (codes) => {
        this.savedCodes = codes;
      },
      error: (err) => {
        console.error('Failed to load saved codes', err);
      }
    });
  }

  saveCurrentCode() {
    const code = this.editor && this.editor.getValue ? this.editor.getValue() : (this.files[this.selectedFileIndex]?.content || '');
    const language = this.languages.find((l: any) => l.id == this.langId)?.name || 'Python';
    this.authService.saveCode(code, language).subscribe({
      next: (response) => {
        this.addConsoleLine('Code saved successfully', 'ok');
        this.loadSavedCodes(); // Refresh the list
      },
      error: (err) => {
        this.addConsoleLine('Failed to save code', 'warn');
        console.error('Save error', err);
      }
    });
  }

  loadCode(snippet: any) {
    // Load the code into the editor
    this.files[this.selectedFileIndex].content = snippet.code;
    // Set language if possible
    const lang = this.languages.find((l: any) => l.name.toLowerCase() === snippet.language.toLowerCase());
    if (lang) {
      this.langId = lang.id;
      this.updateLangLogo();
      setTimeout(() => this.updateEditorLanguage(), 100);
    }
    // Switch back to editor
    this.setActiveIcon('Files');
    this.addConsoleLine('Code loaded from saved', 'ok');
  }

  deleteCode(id: string) {
    if (confirm('Are you sure you want to delete this code?')) {
      const token = localStorage.getItem('token');
      if (token) {
        this.http.delete(`http://localhost:8080/api/code/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'text'
        }).subscribe({
          next: (response: string) => {
            if (response && response.trim().toLowerCase() === 'code deleted') {
              this.savedCodes = this.savedCodes.filter(s => s.id !== id);
              this.addConsoleLine('Code deleted successfully', 'ok');
            } else {
              this.addConsoleLine('Failed to delete code: ' + response, 'warn');
            }
          },
          error: (err) => {
            this.addConsoleLine('Failed to delete code', 'warn');
            console.error('Delete error', err);
          }
        });
      }
    }
  }
}

