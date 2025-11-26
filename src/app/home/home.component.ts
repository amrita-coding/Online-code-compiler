import { Component, OnInit } from '@angular/core';
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
  constructor(private runner: RunnerService) { }

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

  ngOnInit(): void {
    // Subscribe to pyodide status to show runtime readiness in UI
    this.runner.pyStatus$.subscribe(st => {
      if (st.status === 'ready') this.runtimeStatus = 'ready';
      else if (st.status === 'loading') this.runtimeStatus = 'loading: ' + (st.message || '');
      else if (st.status === 'error') this.runtimeStatus = 'error: ' + (st.message || '');
    });
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

    // Execute code using client-side runner
    this.runner.runCode(selectedLangName, this.sourceCode || '', this.input || '')
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
}
