import { Loc, TokenType } from "../frontend/lexer/token.ts";

export enum DiagnosticSeverity {
  WARNING = "warning",
  ERROR = "error",
}

export interface DiagnosticOptions {
  showSuggestions?: boolean;
  onlyWarnings?: boolean;
  colored?: boolean;
  highlightTokens?: boolean;
}

export interface Suggestion {
  message: string;
  replacement?: string;
}

export interface Diagnostic {
  loc: Loc;
  message: string;
  severity: DiagnosticSeverity;
  suggestions?: Suggestion[];
  tokenType?: TokenType;
}

// Cores ANSI para terminal
const colors = {
  // Base
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  white: "\x1b[37m",
  black: "\x1b[30m",

  // Foreground colors
  red: "\x1b[31m",
  lightRed: "\x1b[91m",
  green: "\x1b[32m",
  lightGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  lightYellow: "\x1b[93m",
  blue: "\x1b[34m",
  lightBlue: "\x1b[94m",
  magenta: "\x1b[35m",
  lightMagenta: "\x1b[95m",
  cyan: "\x1b[36m",
  lightCyan: "\x1b[96m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

export class DiagnosticReporter {
  private diagnostics: Diagnostic[] = [];
  private options: DiagnosticOptions = {
    showSuggestions: true,
    onlyWarnings: false,
    colored: true,
    highlightTokens: true,
  };

  constructor(options?: DiagnosticOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * Obtém a cor apropriada para um tipo de token
   */
  private getTokenColor(tokenType: TokenType): string {
    if (!this.options.colored || !this.options.highlightTokens) {
      return "";
    }

    // Keywords (azul)
    if (tokenType >= TokenType.NEW && tokenType <= TokenType.BREAK) {
      return `${colors.bold}${colors.blue}`;
    } // Identifier (ciano)
    else if (tokenType === TokenType.IDENTIFIER) {
      return `${colors.lightCyan}`;
    } // Literals (verde)
    else if (tokenType >= TokenType.STRING && tokenType <= TokenType.NULL) {
      return `${colors.bold}${colors.green}`;
    } // Operators (magenta)
    else if (
      (tokenType >= TokenType.EQUALS && tokenType <= TokenType.OR) ||
      tokenType === TokenType.NOT
    ) {
      return `${colors.bold}${colors.magenta}`;
    } // Delimiters (amarelo)
    else if (
      tokenType === TokenType.COMMA ||
      tokenType === TokenType.COLON ||
      tokenType === TokenType.SEMICOLON ||
      tokenType === TokenType.DOT
    ) {
      return `${colors.yellow}`;
    } // Brackets and Parentheses (cinza claro)
    else if (
      tokenType >= TokenType.LPAREN && tokenType <= TokenType.RBRACKET
    ) {
      return `${colors.bold}${colors.gray}`;
    }

    return "";
  }

  makeSuggestion(message: string, replacement?: string): Suggestion {
    return {
      message: message,
      replacement: replacement,
    };
  }

  /**
   * Adiciona um erro ao reporter
   */
  addError(
    loc: Loc,
    message: string,
    suggestions?: Suggestion[],
    tokenType?: TokenType,
  ): void {
    if (this.options.onlyWarnings) return;

    this.diagnostics.push({
      loc,
      message,
      severity: DiagnosticSeverity.ERROR,
      suggestions,
      tokenType,
    });
  }

  /**
   * Adiciona um aviso ao reporter
   */
  addWarning(
    loc: Loc,
    message: string,
    suggestions?: Suggestion[],
    tokenType?: TokenType,
  ): void {
    this.diagnostics.push({
      loc,
      message,
      severity: DiagnosticSeverity.WARNING,
      suggestions,
      tokenType,
    });
  }

  /**
   * Formata um único diagnóstico em string
   */
  formatDiagnostic(diagnostic: Diagnostic): string {
    const { loc, message, severity, suggestions, tokenType } = diagnostic;
    const { file, line, line_string, start, end } = loc;

    const reset = this.options.colored ? colors.reset : "";
    const severityColor = severity === DiagnosticSeverity.ERROR
      ? colors.red
      : colors.yellow;

    const severityText = severity === DiagnosticSeverity.ERROR
      ? "error"
      : "warning";

    const headerColor = this.options.colored
      ? `${colors.bold}${severityColor}`
      : "";
    const messageColor = this.options.colored ? colors.white : "";
    const locationColor = this.options.colored
      ? `${colors.bold}${colors.gray}`
      : "";

    let output = "";

    // Cabeçalho do diagnóstico
    output +=
      `${headerColor}${severityText}${reset}: ${messageColor}${message}${reset}\n`;
    output += `  ${locationColor}→ ${file}:${line}${reset}\n\n`;

    // Adiciona número da linha com padding
    const lineNumberColor = this.options.colored ? colors.dim : "";
    output += `${lineNumberColor}${line.toString().padStart(6)} |${reset} `;

    // Coloração de tokens se disponível e habilitada
    if (this.options.highlightTokens && this.options.colored) {
      // Esse é um exemplo simples - uma implementação real precisaria de analisador léxico
      // Aqui só estamos colorindo o token problemático
      const parts = [
        line_string.substring(0, start),
        line_string.substring(start, end),
        line_string.substring(end),
      ];

      const tokenColor = tokenType !== undefined
        ? this.getTokenColor(tokenType)
        : "";
      output += parts[0];
      output += tokenColor ? `${tokenColor}${parts[1]}${reset}` : parts[1];
      output += parts[2];
    } else {
      output += line_string;
    }
    output += "\n";

    // Adiciona o sublinhado
    const padding = " ".repeat(6);
    const prefixSpaces = " ".repeat(start);
    const underlineLength = Math.max(1, end - start);
    const underline = "^".repeat(underlineLength);

    const underlineColor = severity === DiagnosticSeverity.ERROR
      ? `${colors.bold}${colors.red}`
      : `${colors.bold}${colors.yellow}`;

    output += `${lineNumberColor}${padding} |${reset} ${prefixSpaces}`;
    output += this.options.colored
      ? `${underlineColor}${underline}${reset}`
      : underline;
    output += "\n";

    // Adiciona as sugestões, se houverem e se estiverem habilitadas
    if (this.options.showSuggestions && suggestions && suggestions.length > 0) {
      const suggestionLabelColor = this.options.colored
        ? `${colors.bold}${colors.green}`
        : "";
      const suggestionTextColor = this.options.colored ? colors.white : "";

      output += "\n";
      for (const suggestion of suggestions) {
        output +=
          `${suggestionLabelColor}Suggestion:${reset} ${suggestionTextColor}${suggestion.message}${reset}\n`;
        if (suggestion.replacement) {
          output +=
            `${suggestionLabelColor}Correction:${reset} ${suggestionTextColor}${suggestion.replacement}${reset}\n`;
        }
      }
    }

    return output;
  }

  /**
   * Formata e retorna todos os diagnósticos como uma string
   */
  formatDiagnostics(): string {
    if (this.diagnostics.length === 0) {
      return "";
    }

    return this.diagnostics
      .map((diagnostic) => this.formatDiagnostic(diagnostic))
      .join("\n\n");
  }

  /**
   * Imprime todos os diagnósticos no console
   */
  printDiagnostics(): void {
    const output = this.formatDiagnostics();
    if (output) {
      console.log(output);
    }
  }

  /**
   * Verifica se há erros nos diagnósticos
   */
  hasErrors(): boolean {
    return this.diagnostics.some(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.ERROR,
    );
  }

  /**
   * Verifica se há avisos nos diagnósticos
   */
  hasWarnings(): boolean {
    return this.diagnostics.some(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.WARNING,
    );
  }

  /**
   * Retorna a contagem de erros
   */
  getErrorCount(): number {
    return this.diagnostics.filter(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.ERROR,
    ).length;
  }

  /**
   * Retorna a contagem de avisos
   */
  getWarningCount(): number {
    return this.diagnostics.filter(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.WARNING,
    ).length;
  }

  /**
   * Limpa todos os diagnósticos
   */
  clear(): void {
    this.diagnostics = [];
  }

  /**
   * Atualiza as opções do reporter
   */
  updateOptions(options: Partial<DiagnosticOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Retorna um resumo dos diagnósticos
   */
  getSummary(): string {
    const errorCount = this.getErrorCount();
    const warningCount = this.getWarningCount();

    if (errorCount === 0 && warningCount === 0) {
      return this.options.colored
        ? `${colors.bold}${colors.green}No problems found!${colors.reset}`
        : "No problems found!";
    }

    const errorText = errorCount === 1 ? "error" : "errors";
    const warningText = warningCount === 1 ? "warning" : "warnings";

    const summaryPrefix = this.options.colored
      ? `${colors.bold}${colors.white}Found:${colors.reset} `
      : "Found: ";

    const errorPart = errorCount > 0
      ? `${
        this.options.colored ? `${colors.bold}${colors.red}` : ""
      }${errorCount} ${errorText}${this.options.colored ? colors.reset : ""}`
      : "";

    const warningPart = warningCount > 0
      ? `${
        this.options.colored ? `${colors.bold}${colors.yellow}` : ""
      }${warningCount} ${warningText}${
        this.options.colored ? colors.reset : ""
      }`
      : "";

    const parts = [errorPart, warningPart].filter(Boolean);
    return `${summaryPrefix}${parts.join(" e ")}`;
  }
}
