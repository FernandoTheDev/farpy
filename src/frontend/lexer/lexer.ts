/**
 * Farpy - A programming language (Optimized Lexer)
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
  private readonly dir: string;
  private readonly reporter: DiagnosticReporter;

  private line: number = 1;
  private offset: number = 0;
  private lineOffset: number = 0;
  private start: number = 0;
  private tokens: Token[] = [];

  private static readonly SINGLE_CHAR_TOKENS = new Map<string, TokenType>([
    ["+", TokenType.PLUS],
    ["-", TokenType.MINUS],
    ["*", TokenType.ASTERISK],
    ["/", TokenType.SLASH],
    [">", TokenType.GREATER_THAN],
    ["<", TokenType.LESS_THAN],
    [",", TokenType.COMMA],
    [";", TokenType.SEMICOLON],
    [":", TokenType.COLON],
    ["(", TokenType.LPAREN],
    [")", TokenType.RPAREN],
    ["{", TokenType.LBRACE],
    ["}", TokenType.RBRACE],
    [".", TokenType.DOT],
    ["%", TokenType.PERCENT],
    ["|", TokenType.PIPE],
    ["=", TokenType.EQUALS],
    ["[", TokenType.LBRACKET],
    ["]", TokenType.RBRACKET],
    ["#", TokenType.C_DIRECTIVE],
    ["!", TokenType.BANG],
    ["&", TokenType.AMPERSAND],
  ]);

  private static readonly MULTI_CHAR_TOKENS = new Map<string, TokenType>([
    ["++", TokenType.INCREMENT],
    ["--", TokenType.DECREMENT],
    ["**", TokenType.EXPONENTIATION],
    ["%%", TokenType.REMAINDER],
    ["==", TokenType.EQUALS_EQUALS],
    [">=", TokenType.GREATER_THAN_OR_EQUALS],
    ["<=", TokenType.LESS_THAN_OR_EQUALS],
    ["&&", TokenType.AND],
    ["||", TokenType.OR],
    ["!=", TokenType.NOT_EQUALS],
    ["..", TokenType.RANGE],
    ["->", TokenType.ARROW],
  ]);

  // Character type lookup tables for performance
  private static readonly ALPHA_CHARS = new Set(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_",
  );
  private static readonly DIGIT_CHARS = new Set("0123456789");
  private static readonly HEX_CHARS = new Set("0123456789abcdefABCDEF");
  private static readonly OCTAL_CHARS = new Set("01234567");
  private static readonly BINARY_CHARS = new Set("01");
  private static readonly WHITESPACE_CHARS = new Set(" \t\r");

  // Cached line splits for better error reporting
  private lineCache?: string[];

  public constructor(
    file: string,
    source: string,
    dir: string,
    reporter: DiagnosticReporter,
  ) {
    this.file = file;
    this.source = source;
    this.dir = dir;
    this.reporter = reporter;
  }

  public tokenize(ignoreNewLine: boolean = false): Token[] | null {
    try {
      const sourceLength = this.source.length;

      while (this.offset < sourceLength) {
        this.start = this.offset - this.lineOffset;
        const char = this.source[this.offset];

        if (char === "\n") {
          if (!ignoreNewLine) {
            this.line++;
            this.offset++;
            this.lineOffset = this.offset;
            continue;
          }
          this.offset++;
          continue;
        }

        if (Lexer.WHITESPACE_CHARS.has(char)) {
          this.offset++;
          continue;
        }

        // Handle comments (optimized check)
        if (char === "/" && this.offset + 1 < sourceLength) {
          const nextChar = this.source[this.offset + 1];
          if (nextChar === "/" || nextChar === "*") {
            if (!this.lexComment()) return null;
            continue;
          }
        }

        // Check multi-character tokens first (more specific)
        if (this.offset + 1 < sourceLength) {
          const twoChar = this.source.substr(this.offset, 2);
          const multiTokenType = Lexer.MULTI_CHAR_TOKENS.get(twoChar);

          if (multiTokenType) {
            this.createToken(multiTokenType, twoChar, 2);
            continue;
          }
        }

        // Check single-character tokens
        const singleTokenType = Lexer.SINGLE_CHAR_TOKENS.get(char);
        if (singleTokenType) {
          this.createToken(singleTokenType, char, 1);
          continue;
        }

        // Handle string literals
        if (char === '"') {
          if (!this.lexString()) return null;
          continue;
        }

        // Handle numbers
        if (Lexer.DIGIT_CHARS.has(char)) {
          this.lexNumber();
          continue;
        }

        // Handle identifiers and keywords
        if (Lexer.ALPHA_CHARS.has(char)) {
          this.lexIdentifier();
          continue;
        }

        // Handle unexpected characters
        this.reportUnexpectedChar(char);
        this.offset++;
      }

      this.createToken(TokenType.EOF, "\0", 0);
      return this.tokens;
    } catch (_error) {
      console.log(_error);
      // Error already reported by individual lex methods
      return null;
    }
  }

  private lexIdentifier(): void {
    const startOffset = this.offset;

    while (this.offset < this.source.length) {
      const char = this.source[this.offset];
      if (!Lexer.ALPHA_CHARS.has(char) && !Lexer.DIGIT_CHARS.has(char)) {
        break;
      }
      this.offset++;
    }

    const identifier = this.source.substring(startOffset, this.offset);
    const tokenType = Keywords[identifier] ?? TokenType.IDENTIFIER;

    this.tokens.push({
      kind: tokenType,
      value: identifier,
      loc: this.getLocation(this.start, this.start + identifier.length),
    });
  }

  private lexNumber(): void {
    const startPos = this.start;

    // Handle special number prefixes (0x, 0o, 0b)
    if (
      this.source[this.offset] === "0" && this.offset + 1 < this.source.length
    ) {
      const prefix = this.source[this.offset + 1].toLowerCase();

      // Hexadecimal (0x or 0X)
      if (prefix === "x") {
        this.lexHexadecimal(startPos);
        return;
      }

      // Octal (0o or 0O)
      if (prefix === "o") {
        this.lexOctal(startPos);
        return;
      }

      // Binary (0b or 0B)
      if (prefix === "b") {
        this.lexBinaryWithPrefix(startPos);
        return;
      }
    }

    let number = this.consumeDigits();

    // Handle range operator (e.g., 123..456)
    if (this.source.substring(this.offset, 2) === "..") {
      this.createTokenWithLocation(
        TokenType.INT,
        parseInt(number, 10),
        startPos,
        number.length,
      );
      this.createToken(TokenType.RANGE, "..", 2);
      return;
    }

    // Handle floating point numbers
    if (this.offset < this.source.length && this.source[this.offset] === ".") {
      const nextChar = this.source[this.offset + 1];
      if (Lexer.DIGIT_CHARS.has(nextChar)) {
        number += ".";
        this.offset++;
        number += this.consumeDigits();

        this.createTokenWithLocation(
          TokenType.FLOAT,
          parseFloat(number),
          startPos,
          number.length,
        );
        return;
      }
    }

    // Handle binary literals with suffix (e.g., 101b)
    if (
      this.offset < this.source.length &&
      this.source[this.offset].toLowerCase() === "b"
    ) {
      this.offset++;
      const binaryValue = number + "b";

      this.createTokenWithLocation(
        TokenType.INT,
        parseInt(binaryValue, 2),
        startPos,
        binaryValue.length,
      );
      return;
    }

    this.createTokenWithLocation(
      TokenType.INT,
      parseInt(number, 10),
      startPos,
      number.length,
    );
  }

  private consumeDigits(): string {
    const start = this.offset;
    while (
      this.offset < this.source.length &&
      Lexer.DIGIT_CHARS.has(this.source[this.offset])
    ) {
      this.offset++;
    }
    return this.source.substring(start, this.offset);
  }

  private consumeHexDigits(): string {
    const start = this.offset;
    while (
      this.offset < this.source.length &&
      Lexer.HEX_CHARS.has(this.source[this.offset])
    ) {
      this.offset++;
    }
    return this.source.substring(start, this.offset);
  }

  private consumeOctalDigits(): string {
    const start = this.offset;
    while (
      this.offset < this.source.length &&
      Lexer.OCTAL_CHARS.has(this.source[this.offset])
    ) {
      this.offset++;
    }
    return this.source.substring(start, this.offset);
  }

  private consumeBinaryDigits(): string {
    const start = this.offset;
    while (
      this.offset < this.source.length &&
      Lexer.BINARY_CHARS.has(this.source[this.offset])
    ) {
      this.offset++;
    }
    return this.source.substring(start, this.offset);
  }

  private lexHexadecimal(startPos: number): void {
    this.offset += 2; // Skip "0x" or "0X"
    const hexDigits = this.consumeHexDigits();

    if (hexDigits.length === 0) {
      this.reportError(
        this.getLocation(startPos, this.offset),
        "Invalid hexadecimal number: missing digits after '0x'",
        "Add hexadecimal digits (0-9, a-f, A-F) after '0x'.",
      );
      throw new Error("Invalid hexadecimal number: missing digits after '0x'");
    }

    const fullHex = "0x" + hexDigits;
    const value = parseInt(hexDigits, 16);

    this.createTokenWithLocation(
      TokenType.INT,
      value,
      startPos,
      fullHex.length,
    );
  }

  private lexOctal(startPos: number): void {
    this.offset += 2; // Skip "0o" or "0O"
    const octalDigits = this.consumeOctalDigits();

    if (octalDigits.length === 0) {
      this.reportError(
        this.getLocation(startPos, this.offset),
        "Invalid octal number: missing digits after '0o'",
        "Add octal digits (0-7) after '0o'.",
      );
      throw new Error("Invalid octal number: missing digits after '0o'");
    }

    const fullOctal = "0o" + octalDigits;
    const value = parseInt(octalDigits, 8);

    this.createTokenWithLocation(
      TokenType.INT,
      value,
      startPos,
      fullOctal.length,
    );
  }

  private lexBinaryWithPrefix(startPos: number): void {
    this.offset += 2; // Skip "0b" or "0B"
    const binaryDigits = this.consumeBinaryDigits();

    if (binaryDigits.length === 0) {
      this.reportError(
        this.getLocation(startPos, this.offset),
        "Invalid binary number: missing digits after '0b'",
        "Add binary digits (0-1) after '0b'.",
      );
      throw new Error("Invalid binary number: missing digits after '0b'");
    }

    const fullBinary = "0b" + binaryDigits;
    const value = parseInt(binaryDigits, 2);

    this.createTokenWithLocation(
      TokenType.INT,
      value,
      startPos,
      fullBinary.length,
    );
  }

  private lexString(): boolean {
    const startPos = this.start;
    let value = "";
    this.offset++; // Skip opening quote

    while (
      this.offset < this.source.length && this.source[this.offset] !== '"'
    ) {
      const char = this.source[this.offset];

      if (char === "\n") {
        this.reportError(
          this.getLocation(startPos, this.start + value.length + 1),
          "String literal contains unescaped line break",
          "Close the string before the line break or use an escaped newline.",
        );
        throw new Error("String literal contains unescaped line break");
      }

      // Handle escape sequences
      if (char === "\\") {
        this.offset++;
        if (this.offset >= this.source.length) break;

        value += this.getEscapedChar(this.source[this.offset]);
      } else {
        value += char;
      }

      this.offset++;
    }

    // Check for unclosed string
    if (this.offset >= this.source.length || this.source[this.offset] !== '"') {
      this.reportError(
        this.getLocation(startPos, this.start + value.length + 1),
        "String not closed",
        "Add '\"' at the end of the desired string.",
      );
      throw new Error("String not closed");
    }

    this.offset++; // Skip closing quote

    this.tokens.push({
      kind: TokenType.STRING,
      value: value,
      loc: this.getLocation(startPos, startPos + value.length + 2),
    });

    return true;
  }

  private getEscapedChar(char: string): string {
    switch (char) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "\\":
        return "\\";
      case '"':
        return '"';
      case "0":
        return "\0";
      default:
        return char;
    }
  }

  private lexComment(): boolean {
    const startPos = this.start;
    const startLine = this.line;
    this.offset++; // Skip first '/'

    if (this.source[this.offset] === "/") {
      // Single-line comment
      this.offset++;
      while (
        this.offset < this.source.length && this.source[this.offset] !== "\n"
      ) {
        this.offset++;
      }
      return true;
    }

    if (this.source[this.offset] === "*") {
      // Multi-line block comment
      this.offset++;

      while (this.offset + 1 < this.source.length) {
        if (
          this.source[this.offset] === "*" &&
          this.source[this.offset + 1] === "/"
        ) {
          this.offset += 2;
          return true;
        }

        if (this.source[this.offset] === "\n") {
          this.line++;
          this.lineOffset = this.offset + 1;
        }

        this.offset++;
      }

      // Unclosed block comment
      this.reportError(
        this.getLocation(startPos, startPos + 2, startLine),
        "Unclosed block comment",
        "Close the comment block with '*/'.",
      );
      throw new Error("Unclosed block comment");
    }

    // Not a comment, backtrack
    this.offset--;
    this.createToken(TokenType.SLASH, "/", 1);
    return true;
  }

  private createToken(
    kind: TokenType,
    value: NativeValue,
    skipChars: number = 1,
  ): Token {
    const valueLength = typeof value === "string"
      ? value.length
      : String(value).length;
    const token: Token = {
      kind,
      value,
      loc: this.getLocation(this.start, this.start + valueLength),
    };

    this.tokens.push(token);
    this.offset += skipChars;
    return token;
  }

  private createTokenWithLocation(
    kind: TokenType,
    value: NativeValue,
    startPos: number,
    length: number,
  ): void {
    this.tokens.push({
      kind,
      value,
      loc: this.getLocation(startPos, startPos + length),
    });
  }

  private getLocation(start: number, end: number, line?: number): Loc {
    const currentLine = line ?? this.line;
    return {
      file: this.file,
      line: currentLine,
      start,
      end,
      line_string: this.getLineText(currentLine),
      dir: this.dir,
    };
  }

  private getLineText(line: number): string {
    if (!this.lineCache) {
      this.lineCache = this.source.split("\n");
    }
    return this.lineCache[line - 1] || "";
  }

  private reportError(
    location: Loc,
    message: string,
    suggestion: string,
  ): void {
    this.reporter.addError(location, message, [
      this.reporter.makeSuggestion(suggestion),
    ]);
    throw new Error(message);
  }

  private reportUnexpectedChar(char: string): void {
    this.reporter.addError(
      this.getLocation(this.start, this.start + 1),
      `Unexpected token "${char}"`,
      [
        this.reporter.makeSuggestion(
          "Remove the character and see if the error is resolved.",
          this.getLineText(this.line).replace(char, ""),
        ),
      ],
    );
    throw new Error(`Unexpected token "${char}"`);
  }
}
