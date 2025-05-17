/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../../error/diagnosticReporter.ts";
import { Keywords, Loc, NativeValue, Token, TokenType } from "./token.ts";

export class Lexer {
  public source: string;
  private file: string;
  protected line: number = 1;
  protected offset: number = 0; // Offset global
  protected lineOffset: number = 0; // Offset relative to current line
  protected start: number = 0;
  protected tokens: Token[] = [];
  private static SINGLE_CHAR_TOKENS: { [key: string]: TokenType } = {
    "+": TokenType.PLUS,
    "-": TokenType.MINUS,
    "*": TokenType.ASTERISK,
    "/": TokenType.SLASH,
    ">": TokenType.GREATER_THAN,
    "<": TokenType.LESS_THAN,
    ",": TokenType.COMMA,
    ";": TokenType.SEMICOLON,
    ":": TokenType.COLON,
    "(": TokenType.LPAREN,
    ")": TokenType.RPAREN,
    "{": TokenType.LBRACE,
    "}": TokenType.RBRACE,
    ".": TokenType.DOT,
    "%": TokenType.PERCENT,
    "|": TokenType.PIPE,
    "=": TokenType.EQUALS,
    "[": TokenType.LBRACKET,
    "]": TokenType.RBRACKET,
    "#": TokenType.C_DIRECTIVE,
    "!": TokenType.BANG,
    "&": TokenType.AMPERSAND,
  };
  private static MULTI_CHAR_TOKENS: { [key: string]: TokenType } = {
    "++": TokenType.INCREMENT,
    "--": TokenType.DECREMENT,
    "**": TokenType.EXPONENTIATION,
    "%%": TokenType.REMAINDER,
    "==": TokenType.EQUALS_EQUALS,
    ">=": TokenType.GREATER_THAN_OR_EQUALS,
    "<=": TokenType.LESS_THAN_OR_EQUALS,
    "&&": TokenType.AND,
    "||": TokenType.OR,
    "!=": TokenType.NOT_EQUALS,
    "..": TokenType.RANGE,
    "->": TokenType.ARROW,
  };

  public constructor(
    file: string,
    source: string,
    private readonly dir: string,
    private readonly reporter: DiagnosticReporter,
  ) {
    this.file = file;
    this.source = source;
  }

  public tokenize(ignoreNewLine: boolean = false): Token[] | null {
    try {
      while (this.offset < this.source.length) {
        this.start = this.offset - this.lineOffset; // Sets start to local offset
        const char = this.source[this.offset];

        if (char === "\n" && !ignoreNewLine) {
          this.line++;
          this.offset++;
          this.lineOffset = this.offset;
          continue;
        }

        if (char === " " || char === "\t" || char === "\r") {
          this.offset++;
          continue;
        }

        // Handle comments
        if (char === "/") {
          if (this.offset + 1 < this.source.length) {
            const nextChar = this.source[this.offset + 1];
            if (nextChar === "/" || nextChar === "*") {
              this.lexing_comment();
              continue;
            }
          }
        }

        // Check for multi-character tokens
        if (this.offset + 1 < this.source.length) {
          const multiChar = char + this.source[this.offset + 1];
          const multiTokenType = Lexer.MULTI_CHAR_TOKENS[multiChar];

          if (multiTokenType) {
            this.createToken(multiTokenType, multiChar, 2);
            continue;
          }
        }

        // Check for single-character tokens
        const singleTokenType = Lexer.SINGLE_CHAR_TOKENS[char];
        if (singleTokenType) {
          this.createToken(singleTokenType, char, 1);
          continue;
        }

        // Handle strings
        if (char === '"') {
          this.lexing_string();
          continue;
        }

        // Handle numbers
        if (this.isDigit(char)) {
          this.lexing_digit();
          continue;
        }

        // Handle identifiers and keywords
        if (this.isAlpha(char) || char === "_") {
          this.lexing_alphanumeric();
          continue;
        }

        // Handle unexpected characters
        this.reporter.addError(
          this.makeLocation(char),
          `Unexpected token "${char}"`,
          [
            this.reporter.makeSuggestion(
              "Remove the character and see if the error is resolved.",
              this.getLineText(this.line).replace(char, ""),
            ),
          ],
        );
        this.offset++; // Skip the problematic character
      }
    } catch (_error: any) {
      return null;
    }

    this.createToken(TokenType.EOF, "\0", 0);
    return this.tokens;
  }

  private lexing_alphanumeric(): void {
    let id = "";

    while (
      this.offset < this.source.length &&
      (this.isAlpha(this.source[this.offset]) ||
        this.isDigit(this.source[this.offset]) ||
        this.source[this.offset] === "_")
    ) {
      id += this.source[this.offset];
      this.offset++;
    }

    // Check if it's a keyword
    if (Keywords[id] !== undefined) {
      const token: Token = {
        kind: Keywords[id],
        value: id,
        loc: this.getLocation(this.start, this.start + id.length),
      };
      this.tokens.push(token);
    } else {
      const token: Token = {
        kind: TokenType.IDENTIFIER,
        value: id,
        loc: this.getLocation(this.start, this.start + id.length),
      };
      this.tokens.push(token);
    }
  }

  private lexing_digit(): void {
    let number = this.lexing_basic_num();
    const startPos = this.start;

    if (
      this.source[this.offset] === "." &&
      this.source[this.offset + 1] === "." &&
      this.offset <= this.source.length
    ) {
      this.createToken(TokenType.INT, Number(number), 0);
      this.createToken(TokenType.RANGE, "..", 2);
      return;
    }

    // Check if it's a float
    if (this.offset < this.source.length && this.source[this.offset] === ".") {
      number += this.source[this.offset];

      this.offset++;
      number += this.lexing_basic_num();

      const token: Token = {
        kind: TokenType.FLOAT,
        value: parseFloat(number),
        loc: this.getLocation(startPos, startPos + number.length),
      };
      this.tokens.push(token);
      return;
    }

    // Check if it's a binary
    if (this.offset < this.source.length && this.source[this.offset] === "b") {
      number += this.source[this.offset];
      this.offset++;
      number += this.lexing_basic_num();

      const token: Token = {
        kind: TokenType.BINARY,
        value: number,
        loc: this.getLocation(startPos, startPos + number.length),
      };
      this.tokens.push(token);
      return;
    }

    const token: Token = {
      kind: TokenType.INT,
      value: parseInt(number),
      loc: this.getLocation(startPos, startPos + number.length),
    };
    this.tokens.push(token);
  }

  private lexing_basic_num(): string {
    let num = "";
    while (
      this.offset < this.source.length &&
      this.isDigit(this.source[this.offset])
    ) {
      num += this.source[this.offset];
      this.offset++;
    }
    return num;
  }

  private lexing_string(): void {
    let value = "";
    const startPos = this.start;
    this.offset++; // Skip opening quote

    while (
      this.offset < this.source.length &&
      this.source[this.offset] !== '"'
    ) {
      if (this.source[this.offset] === "\n") {
        this.reporter.addError(
          this.getLocation(startPos, this.start + value.length + 1),
          "String literal contains unescaped line break",
          [
            this.reporter.makeSuggestion(
              "Close the string before the line break or use an escaped newline.",
            ),
          ],
        );
        throw new Error("String not closed");
      }

      // Handle escape sequences
      if (this.source[this.offset] === "\\") {
        this.offset++;
        if (this.offset >= this.source.length) {
          break;
        }

        switch (this.source[this.offset]) {
          case "n":
            value += "\n";
            break;
          case "t":
            value += "\t";
            break;
          case "r":
            value += "\r";
            break;
          case "\\":
            value += "\\";
            break;
          case '"':
            value += '"';
            break;
          default:
            value += this.source[this.offset];
        }
      } else {
        value += this.source[this.offset];
      }

      this.offset++;
    }

    if (this.offset >= this.source.length || this.source[this.offset] !== '"') {
      this.reporter.addError(
        this.getLocation(startPos, this.start + value.length + 1),
        "String not closed",
        [
          this.reporter.makeSuggestion(
            "Add '\"' at the end of the desired string.",
          ),
        ],
      );
      throw new Error("String not closed");
    }

    this.offset++; // Skip closing quote

    const token: Token = {
      kind: TokenType.STRING,
      value: value,
      loc: this.getLocation(startPos, this.start + value.length + 2),
    };
    this.tokens.push(token);
  }

  private lexing_comment(): void {
    const startPos = this.start;
    const startLine = this.line;
    this.offset++; // Skip first '/'

    if (this.source[this.offset] === "/") {
      // Single-line comment
      this.offset++;
      while (
        this.offset < this.source.length &&
        this.source[this.offset] !== "\n"
      ) {
        this.offset++;
      }
      return;
    }

    if (this.source[this.offset] === "*") {
      // Multi-line block comment
      this.offset++;
      while (
        this.offset + 1 < this.source.length &&
        !(this.source[this.offset] === "*" &&
          this.source[this.offset + 1] === "/")
      ) {
        if (this.source[this.offset] === "\n") {
          this.line++;
          this.lineOffset = this.offset + 1;
        }
        this.offset++;
      }

      if (this.offset + 1 < this.source.length) {
        this.offset += 2; // Skip closing "*/"
      } else {
        this.reporter.addError(
          this.getLocation(startPos, startPos + 2, startLine),
          "Unclosed block comment",
          [
            this.reporter.makeSuggestion(
              "Close the comment block with '*/'.",
            ),
          ],
        );
        throw new Error("Unclosed block comment");
      }
      return;
    }

    // If we reach here, it was just a division operator
    this.offset--; // Go back to the '/'
    this.createToken(TokenType.SLASH, "/", 1);
  }

  private isAlpha(char: string): boolean {
    return /^[a-zA-Z]$/.test(char);
  }

  private isDigit(char: string): boolean {
    return /^[0-9]$/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char) || char === "_";
  }

  private getLocation(start: number, end: number, line?: number): Loc {
    const currentLine = line !== undefined ? line : this.line;
    return {
      file: this.file,
      line: currentLine,
      start,
      end,
      line_string: this.getLineText(currentLine),
      dir: this.dir,
    };
  }

  private makeLocation(value: any, line?: number): Loc {
    const valueLength = typeof value === "string"
      ? value.length
      : String(value).length;
    return this.getLocation(this.start, this.start + valueLength, line);
  }

  private createToken(
    kind: TokenType,
    value: NativeValue,
    skipChars: number = 1,
  ): Token {
    const token: Token = {
      kind,
      value,
      loc: this.makeLocation(value),
    };
    this.tokens.push(token);
    this.offset += skipChars;
    return token;
  }

  private getLineText(line: number): string {
    const lines = this.source.split("\n");
    return lines[line - 1] || "";
  }
}
