/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { Lexer } from "../frontend/lexer/lexer.ts";
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
  italic: "\x1b[3m",

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

  orange: "\x1b[38;5;208m",
  lightOrange: "\x1b[38;5;214m",
  darkOrange: "\x1b[38;5;202m",

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

  private getTokenColor(tokenType: TokenType): string {
    if (!this.options.colored || !this.options.highlightTokens) {
      return "";
    }

    switch (tokenType) {
      // Keywords
      case TokenType.NEW:
      case TokenType.MUT:
      case TokenType.IF:
      case TokenType.ELIF:
      case TokenType.ELSE:
      case TokenType.FOR:
      case TokenType.WHILE:
      case TokenType.FN:
      case TokenType.RETURN:
      case TokenType.IMPORT:
      case TokenType.AS:
      case TokenType.BREAK:
      case TokenType.EXTERN:
      case TokenType.START:
      case TokenType.END:
      case TokenType.STRUCT:
        return `${colors.bold}${colors.darkOrange}`;

      // Identifier
      case TokenType.IDENTIFIER:
        return `${colors.white}`;

      // Types/Literals
      case TokenType.STRING:
        return `${colors.green}`;

      case TokenType.INT:
      case TokenType.FLOAT:
      case TokenType.BINARY:
        return `${colors.magenta}`;

      case TokenType.NULL:
        return `${colors.magenta}`;

      // Operators
      case TokenType.EQUALS:
      case TokenType.PLUS:
      case TokenType.INCREMENT:
      case TokenType.MINUS:
      case TokenType.DECREMENT:
      case TokenType.SLASH:
      case TokenType.ASTERISK:
      case TokenType.EXPONENTIATION:
      case TokenType.PERCENT:
      case TokenType.REMAINDER:
      case TokenType.EQUALS_EQUALS:
      case TokenType.NOT_EQUALS:
      case TokenType.GREATER_THAN:
      case TokenType.LESS_THAN:
      case TokenType.GREATER_THAN_OR_EQUALS:
      case TokenType.LESS_THAN_OR_EQUALS:
      case TokenType.AND:
      case TokenType.OR:
      case TokenType.PIPE:
      case TokenType.NOT:
      case TokenType.RANGE:
      case TokenType.STEP:
      case TokenType.ARROW:
        return `${colors.lightOrange}`;

      // Delimiters
      case TokenType.COMMA:
      case TokenType.COLON:
      case TokenType.SEMICOLON:
      case TokenType.DOT:
        return `${colors.gray}`;

      // Brackets and Parentheses
      case TokenType.LPAREN:
      case TokenType.RPAREN:
      case TokenType.LBRACE:
      case TokenType.RBRACE:
      case TokenType.LBRACKET:
      case TokenType.RBRACKET:
        return `${colors.yellow}`;

      // Default
      default:
        return `${colors.white}`;
    }
  }

  makeSuggestion(message: string, replacement?: string): Suggestion {
    return {
      message: message,
      replacement: replacement,
    };
  }

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

  formatDiagnostic(diagnostic: Diagnostic): string {
    const { loc, message, severity, suggestions, tokenType } = diagnostic;
    const { file, line, line_string, start, end, dir } = loc;

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

    output +=
      `${headerColor}${severityText}${reset}: ${messageColor}${message}${reset}\n`;
    output += `  ${locationColor}→ ${file}:${line}${reset}\n\n`;

    const lineNumberColor = this.options.colored ? colors.dim : "";
    output += `${lineNumberColor}${line.toString().padStart(6)} |${reset} `;

    if (this.options.highlightTokens && this.options.colored) {
      const tokens = new Lexer(file, line_string, dir, this).tokenize(true);

      if (tokens && tokens.length > 0) {
        tokens.sort((a, b) => a.loc.start - b.loc.start);

        let coloredLine = "";
        let lastPos = 0;

        for (const token of tokens) {
          if (token.loc.start > lastPos) {
            if (line_string.substring(lastPos, token.loc.start) != '"') {
              coloredLine += line_string.substring(
                lastPos,
                token.loc.start,
              );
            }
          }

          if (token.kind == TokenType.STRING) {
            token.value = `"${token.value}"`;
            token.value = (token.value as string).replaceAll("\n", "\\n");
          }

          const tokenColor = this.getTokenColor(token.kind);
          coloredLine += `${tokenColor}${token.value}${reset}`;

          lastPos = token.loc.end;
        }

        output += coloredLine;
      } else {
        const errorTokenColor = tokenType !== undefined
          ? this.getTokenColor(tokenType)
          : `${colors.bold}${colors.red}`;

        const parts = [
          line_string.substring(0, start),
          line_string.substring(start, end),
          line_string.substring(end),
        ];

        output += parts[0];
        output += `${errorTokenColor}${parts[1]}${reset}`;
        output += parts[2];
      }
    } else {
      output += line_string;
    }
    output += "\n";

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

  formatDiagnostics(): string {
    if (this.diagnostics.length === 0) {
      return "";
    }

    return this.diagnostics
      .map((diagnostic) => this.formatDiagnostic(diagnostic))
      .join("\n\n");
  }

  printDiagnostics(): void {
    const output = this.formatDiagnostics();
    if (output) {
      console.log(output);
    }
  }

  hasErrors(): boolean {
    return this.diagnostics.some(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.ERROR,
    );
  }

  hasWarnings(): boolean {
    return this.diagnostics.some(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.WARNING,
    );
  }

  getErrorCount(): number {
    return this.diagnostics.filter(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.ERROR,
    ).length;
  }

  getWarningCount(): number {
    return this.diagnostics.filter(
      (diagnostic) => diagnostic.severity === DiagnosticSeverity.WARNING,
    ).length;
  }

  clear(): void {
    this.diagnostics = [];
  }

  updateOptions(options: Partial<DiagnosticOptions>): void {
    this.options = { ...this.options, ...options };
  }

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
