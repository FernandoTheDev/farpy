/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { Token, TokenType } from "../lexer/token.ts";
import { TypesNative } from "../values.ts";
import {
  createArrayType,
  createPointerType,
  createTypeInfo,
  TypeInfo,
} from "./ast.ts";

/**
 * ParseType - Responsável por analisar declarações de tipos complexos
 * Suporta:
 * - Tipos básicos (int, string, etc)
 * - Arrays (int[], string[], etc)
 * - Arrays multidimensionais (int[][], int[][][], etc)
 * - Ponteiros (*int, **int, etc)
 * - Combinações (*int[], int*[], **int[][], etc)
 */
export class ParseType {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): TypeInfo {
    const pointerLevel = this.parsePointerPrefix();

    const baseType = this.parseBaseType();

    const dimensions = this.parseArrayDimensions();

    let typeInfo: TypeInfo;

    if (dimensions > 0) {
      typeInfo = createArrayType(baseType, dimensions);
    } else {
      typeInfo = createTypeInfo(baseType);
    }

    if (pointerLevel > 0) {
      typeInfo = createPointerType(typeInfo, pointerLevel);
    }

    return typeInfo;
  }

  private parsePointerPrefix(): number {
    let pointerLevel = 0;

    while (
      this.check(TokenType.ASTERISK) || this.check(TokenType.EXPONENTIATION)
    ) {
      if (this.peek().kind == TokenType.EXPONENTIATION) {
        pointerLevel += 2;
      } else {
        pointerLevel++;
      }
      this.advance(); // '*' || '**'
    }

    return pointerLevel;
  }

  private parseBaseType(): TypesNative {
    const token = this.advance();
    return this.tokenValueToTypesNative(token);
  }

  private parseArrayDimensions(): number {
    let dimensions = 0;

    while (this.match(TokenType.LBRACKET, TokenType.RBRACKET)) {
      dimensions++;
    }

    return dimensions;
  }

  private tokenValueToTypesNative(token: Token): TypesNative {
    const value = token.value as string;

    switch (value) {
      case "int":
      case "i32":
        return "int";
      case "i64":
        return "i64";
      case "i128":
      case "long":
        return "i128";
      case "float":
      case "double":
        return "double";
      case "string":
        return "string";
      case "bool":
        return "bool";
      default:
        throw new Error("Tipo desconhecido:" + value);
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().kind === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
}

export function parseArrayBrackets(
  tokens: Token[],
  startIndex: number,
): { isValid: boolean; dimensions: number; endIndex: number } {
  let current = startIndex;
  let dimensions = 0;

  while (current < tokens.length - 1) {
    if (
      tokens[current].kind === TokenType.LBRACKET &&
      tokens[current + 1].kind === TokenType.RBRACKET
    ) {
      dimensions++;
      current += 2;
    } else {
      break;
    }
  }

  return {
    isValid: dimensions > 0,
    dimensions,
    endIndex: current,
  };
}

export function parseTypeAnnotation(tokens: Token[], startIndex: number): {
  typeInfo: TypeInfo;
  endIndex: number;
} {
  const parser = new ParseType(tokens.slice(startIndex));
  const typeInfo = parser.parse();

  const tokensConsumed = parser["current"];

  return {
    typeInfo,
    endIndex: startIndex + tokensConsumed,
  };
}
