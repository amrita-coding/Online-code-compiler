// C/C++ Runtime - Client-side interpreter using proper execution model

class CCPPRuntime {
  constructor() {
    this.variables = {};
    this.functions = {};
    this.output = '';
    this.inputTokens = [];
    this.inputIndex = 0;
  }

  setInput(input) {
    this.inputTokens = input.trim().split(/\s+/).filter(t => t.length > 0);
    this.inputIndex = 0;
  }

  addOutput(text) {
    this.output += text;
  }

  /**
   * Remove comments and includes from code
   */
  preprocessCode(code) {
    // Remove #include statements
    code = code.replace(/#include\s*[<"]([^>"]*)[>"]/g, '');
    
    // Remove single-line comments
    code = code.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return code;
  }

  /**
   * Parse function definitions with flexible signatures
   */
  parseFunctions(code) {
    // Match: type name(params) { body }
    const funcRegex = /(\w+)\s+(\w+)\s*\(\s*([^)]*)\s*\)\s*\{([\s\S]*?)\n\s*\}/g;
    let match;
    
    while ((match = funcRegex.exec(code)) !== null) {
      const returnType = match[1];
      const funcName = match[2];
      const paramStr = match[3].trim();
      const body = match[4];
      
      // Parse parameters
      const params = [];
      if (paramStr) {
        const paramParts = paramStr.split(',').map(p => p.trim());
        for (const param of paramParts) {
          const parts = param.split(/\s+/);
          if (parts.length >= 2) {
            params.push(parts[parts.length - 1]); // Take last word as param name
          }
        }
      }
      
      this.functions[funcName] = { returnType, params, body };
    }
  }

  /**
   * Parse variable declarations
   */
  parseVariables(code) {
    // Match: type varName; or type varName = value;
    const declRegex = /(\w+)\s+(\w+)\s*(?:=\s*(-?\d+))?\s*;/g;
    let match;
    
    while ((match = declRegex.exec(code)) !== null) {
      const type = match[1];
      const varName = match[2];
      const value = match[3];
      
      // Only handle int and basic types
      if (type === 'int' || type === 'long' || type === 'short') {
        this.variables[varName] = value ? parseInt(value) : 0;
      }
    }
  }

  /**
   * Replace variables and function calls in expression
   */
  substituteExpression(expr) {
    let result = expr.trim();
    
    // Replace function calls with their return values
    for (const [funcName, func] of Object.entries(this.functions)) {
      const callRegex = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`, 'g');
      result = result.replace(callRegex, (match, argsStr) => {
        return this.exgoecuteFunction(funcName, argsStr);
      });
    }
    
    // Replace variables with their values
    for (const [varName, value] of Object.entries(this.variables)) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * Execute a function with given arguments
   */
  executeFunction(funcName, argsStr) {
    try {
      const func = this.functions[funcName];
      if (!func) return '0';
      
      // Parse and evaluate arguments
      const args = argsStr.split(',').map(arg => {
        const trimmed = arg.trim();
        if (isNaN(trimmed)) {
          // It's a variable or expression
          const substituted = this.substituteExpression(trimmed);
          return eval(substituted);
        }
        return parseInt(trimmed);
      });
      
      // Map parameters to arguments
      const localVars = {};
      for (let i = 0; i < func.params.length; i++) {
        localVars[func.params[i]] = args[i] || 0;
      }
      
      // Execute function body to find return statement
      const returnRegex = /return\s+([^;]+);/;
      const returnMatch = returnRegex.exec(func.body);
      
      if (returnMatch) {
        let returnExpr = returnMatch[1].trim();
        
        // Substitute local variables
        for (const [varName, value] of Object.entries(localVars)) {
          const regex = new RegExp(`\\b${varName}\\b`, 'g');
          returnExpr = returnExpr.replace(regex, value);
        }
        
        // Substitute global variables
        for (const [varName, value] of Object.entries(this.variables)) {
          const regex = new RegExp(`\\b${varName}\\b`, 'g');
          returnExpr = returnExpr.replace(regex, value);
        }
        
        try {
          return eval(returnExpr).toString();
        } catch {
          return '0';
        }
      }
      
      return '0';
    } catch (e) {
      console.error('Function execution error:', funcName, e);
      return '0';
    }
  }

  /**
   * Evaluate expression with substitution
   */
  evaluateExpression(expr) {
    try {
      const substituted = this.substituteExpression(expr);
      return eval(substituted);
    } catch (e) {
      console.error('Expression evaluation error:', expr, e);
      return 0;
    }
  }

  /**
   * Evaluate boolean condition
   */
  evaluateCondition(condition) {
    try {
      const substituted = this.substituteExpression(condition);
      return eval(substituted);
    } catch (e) {
      console.error('Condition evaluation error:', condition, e);
      return false;
    }
  }

  /**
   * Process scanf input
   */
  processScanf(code) {
    const scanfRegex = /scanf\s*\(\s*"(%d)"\s*,\s*&(\w+)\s*\)/g;
    let match;
    while ((match = scanfRegex.exec(code)) !== null) {
      const varName = match[2];
      if (this.inputIndex < this.inputTokens.length) {
        this.variables[varName] = parseInt(this.inputTokens[this.inputIndex++]);
      }
    }
  }

  /**
   * Format and output printf string
   */
  formatPrintf(formatStr, argStr) {
    // Handle escape sequences
    formatStr = formatStr
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
    
    // Parse and substitute arguments
    const args = argStr ? argStr.split(',').map(arg => arg.trim()) : [];
    
    let argIndex = 0;
    formatStr = formatStr.replace(/%d/g, () => {
      if (argIndex < args.length) {
        const arg = args[argIndex++];
        // Try to evaluate the argument
        try {
          const substituted = this.substituteExpression(arg);
          return eval(substituted).toString();
        } catch {
          return this.variables[arg] !== undefined ? this.variables[arg] : arg;
        }
      }
      return '%d';
    });
    
    return formatStr;
  }

  /**
   * Execute printf statements in code block
   */
  executePrintfInCode(code) {
    const printfRegex = /printf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\)/g;
    let match;
    
    while ((match = printfRegex.exec(code)) !== null) {
      const formatStr = match[1];
      const argStr = match[2] || '';
      
      const output = this.formatPrintf(formatStr, argStr);
      this.addOutput(output);
    }
  }

  /**
   * Main execution method
   */
  execute(code) {
    this.output = '';
    this.variables = {};
    this.functions = {};
    this.inputIndex = 0;
    
    try {
      // Phase 1: Preprocess (remove includes, comments)
      code = this.preprocessCode(code);
      
      // Phase 2: Parse functions and variables
      this.parseFunctions(code);
      this.parseVariables(code);
      
      // Phase 3: Process input
      this.processScanf(code);
      
      // Phase 4: Find and execute main function
      const mainMatch = /int\s+main\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/g.exec(code);
      
      if (mainMatch) {
        // Execute main function body
        const mainBody = mainMatch[1];
        this.executeMainBody(mainBody);
      } else {
        // No main function, try to execute printf statements directly
        this.executePrintfInCode(code);
      }
      
      if (!this.output) {
        this.output = 'Program executed with no output.\n';
      }
      
      return { success: true, output: this.output };
    } catch (error) {
      console.error('Runtime error:', error);
      return { success: false, output: '', error: error.toString() };
    }
  }

  /**
   * Execute main function body
   */
  executeMainBody(mainBody) {
    // Handle for loops
    const forRegex = /for\s*\(\s*(\w+)\s*(\w+)\s*=\s*(-?\d+)\s*;\s*\w+\s*(<|<=|>|>=|==|!=)\s*(-?\d+)\s*;\s*\w+\+\+\s*\)\s*\{([\s\S]*?)\}/g;
    let match;
    
    let lastIndex = 0;
    const forMatches = [];
    
    while ((match = forRegex.exec(mainBody)) !== null) {
      forMatches.push({
        fullMatch: match[0],
        index: match.index,
        varType: match[1],
        varName: match[2],
        start: parseInt(match[3]),
        operator: match[4],
        end: parseInt(match[5]),
        body: match[6]
      });
    }
    
    // Execute for loops
    for (const forLoop of forMatches) {
      let endValue = forLoop.end;
      
      switch(forLoop.operator) {
        case '<': endValue = forLoop.end - 1; break;
        case '<=': endValue = forLoop.end; break;
        case '>': endValue = forLoop.end + 1; break;
        case '>=': endValue = forLoop.end; break;
      }
      
      for (let i = forLoop.start; i <= endValue; i++) {
        this.variables[forLoop.varName] = i;
        this.executePrintfInCode(forLoop.body);
      }
    }
    
    // Execute printf outside of loops
    for (const forMatch of forMatches) {
      mainBody = mainBody.replace(forMatch.fullMatch, '');
    }
    
    this.executePrintfInCode(mainBody);
  }
}

// Web Worker message handler
self.onmessage = function(e) {
  const msg = e.data || {};
  
  if (msg.type === 'run') {
    const runtime = new CCPPRuntime();
    runtime.setInput(msg.stdin || '');
    
    const result = runtime.execute(msg.code || '');
    
    self.postMessage({
      type: 'result',
      stdout: result.output,
      stderr: result.error || ''
    });
  }
};