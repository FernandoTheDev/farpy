/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
export enum TokenType {
  // Keywords
  NEW, // new x = EXPR 0
  MUT, // new mut x = EXPR 1
  IF, // if 2
  ELIF, // } elif () { 3
  ELSE, // else 4
  FOR, // for 5
  WHILE, // while 6
  FN, // fn x() {} 7
  RETURN, // return EXPR 8
  IMPORT, // import x 9
  AS, // import x as y 10
  BREAK, // break 11

  IDENTIFIER, // omg 12

  // Types
  STRING, // "omg" 13
  INT, // 10 14
  FLOAT, // 10.1 15
  NULL, // null 16

  // Especials
  BINARY, // 17

  // Symbols
  EQUALS, // = 18
  PLUS, // + 19
  INCREMENT, // ++ 20
  MINUS, // - 21
  DECREMENT, // -- 22
  SLASH, // / 23
  ASTERISK, // * 24
  EXPONENTIATION, // ** 25
  PERCENT, // % 26
  REMAINDER, // %% 27
  EQUALS_EQUALS, // == 28
  NOT_EQUALS, // != 29
  GREATER_THAN, // > 30
  LESS_THAN, // < 31
  GREATER_THAN_OR_EQUALS, // >= 32
  LESS_THAN_OR_EQUALS, // <= 33
  AND, // && 34
  OR, // || 35
  PIPE, // | // new x: <T> | <T> = <EXPR> 36
  COMMA, // , 37
  COLON, // : 38
  SEMICOLON, // ; 39
  DOT, // . 40
  LPAREN, // ( 41
  RPAREN, // ) 42
  LBRACE, // { 43
  RBRACE, // } 44
  LBRACKET, // [ 45
  RBRACKET, // ] 46
  NOT, // ] 48
  RANGE, // .. 49
  STEP, // step 50

  EOF, // EndOfFile 47
  ARROW, // -> 51
  EXTERN, // keyword 52
  START, // start 53
  END, // start 54
  STRUCT, // struct 55
  C_DIRECTIVE, // # 56
}

export type NativeValue =
  | string
  | boolean
  | number
  | null
  | void
  | object
  | CallableFunction;

export interface Loc {
  file: string;
  line: number;
  line_string: string;
  start: number;
  end: number;
  dir: string;
}

export type Token = {
  kind: TokenType;
  value: NativeValue; // It already comes with the typed value
  loc: Loc;
};

export const Keywords: Record<string, TokenType> = {
  "new": TokenType.NEW,
  "mut": TokenType.MUT,
  "if": TokenType.IF,
  "else": TokenType.ELSE,
  "elif": TokenType.ELIF,
  "fn": TokenType.FN,
  "return": TokenType.RETURN,
  "for": TokenType.FOR,
  "while": TokenType.WHILE,
  "import": TokenType.IMPORT,
  "as": TokenType.AS,
  "break": TokenType.BREAK,
  "step": TokenType.STEP,
  "extern": TokenType.EXTERN,
  "start": TokenType.START,
  "end": TokenType.END,
  "struct": TokenType.STRUCT,
};
