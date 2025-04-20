import { TypesNative } from "../compiler/values.ts";
import { Loc, Token, TokenType } from "../lexer/token.ts";
import {
  AST_FLOAT,
  AST_IDENTIFIER,
  AST_INT,
  AST_NULL,
  AST_STRING,
  BinaryExpr,
  Expr,
  Program,
  Stmt,
} from "./ast.ts";

type PrefixParseFn = () => Expr;
type InfixParseFn = (left: Expr) => Expr;

enum Precedence {
  LOWEST = 1,
  ASSIGN = 2, // =
  OR = 3, // ||
  AND = 4, // &&
  EQUALS = 5, // == !=
  COMPARISON = 6, // < > <= >=
  SUM = 7, // + -
  PRODUCT = 8, // * / %
  EXPONENT = 9, // **
  PREFIX = 10, // -x !x
  CALL = 11, // myFunction(x)
}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Entry point
  public parse(): Program {
    const program: Program = {
      kind: "Program",
      type: "null",
      value: null,
      body: [],
      loc: {} as Loc,
    };
    while (!this.isAtEnd()) {
      program.body!.push(this.parseStmt());
    }
    program.loc = this.tokens.length > 0
      ? this.tokens[0].loc && this.tokens[this.tokens.length - 1].loc
      : {} as Loc;
    return program;
  }

  private parseStmt(): Stmt {
    return this.parseExpressionStatement();
  }

  private parseExpressionStatement(): Expr {
    const expr = this.parseExpression(Precedence.LOWEST);
    // optionally consume semicolon
    if (this.match(TokenType.SEMICOLON)) {
      // ignore
    }
    return expr;
  }

  private parseExpression(precedence: Precedence): Expr {
    let left = this.parsePrefix();

    while (!this.isAtEnd() && precedence < this.peekPrecedence()) {
      const infix = this.getInfixFn(this.peek().kind);
      if (!infix) break;
      left = infix.call(this, left);
    }

    return left;
  }

  private parsePrefix(): Expr {
    const token = this.advance();

    switch (token.kind) {
      case TokenType.INT:
        return AST_INT(token.value as number, token.loc);
      case TokenType.FLOAT:
        return AST_FLOAT(token.value as number, token.loc);
      case TokenType.STRING:
        return AST_STRING(token.value as string, token.loc);
      case TokenType.NULL:
      case TokenType.EOF:
        return AST_NULL(token.loc);
      case TokenType.IDENTIFIER: {
        const name = token.value!.toString();
        if (this.peek().kind === TokenType.LPAREN) {
          return this.parseCallExpression(AST_IDENTIFIER(name, token.loc));
        }
        return AST_IDENTIFIER(name, token.loc);
      }
      case TokenType.LPAREN: {
        const expr = this.parseExpression(Precedence.LOWEST);
        this.consume(TokenType.RPAREN, "Expect ')' after expression.");
        return expr;
      }
      default:
        throw new Error(`No prefix parse function for ${token.value}`);
    }
  }

  private parseCallExpression(callee: Expr): Expr {
    // consume '('
    const paren = this.peek();
    this.advance();
    const args: Expr[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression(Precedence.LOWEST));
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expect ')' after arguments.");
    return {
      kind: "CallExpr",
      callee,
      arguments: args,
      loc: this.makeLoc(callee.loc, paren.loc),
    } as any;
  }

  private getInfixFn(kind: TokenType): InfixParseFn | undefined {
    switch (kind) {
      case TokenType.PLUS:
      case TokenType.MINUS:
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
        return this.parseBinaryInfix;
      default:
        return undefined;
    }
  }

  private parseBinaryInfix(left: Expr): Expr {
    this.advance();
    const operatorToken = this.previous();
    const precedence = this.getPrecedence(operatorToken.kind);
    const right = this.parseExpression(precedence);
    const type = this.inferType(left, right);
    return {
      kind: "BinaryExpr",
      operator: operatorToken.value!.toString(),
      left,
      right,
      type,
      loc: this.makeLoc(left.loc, right.loc),
    } as BinaryExpr;
  }

  // Helpers
  private isAtEnd(): boolean {
    return this.peek().kind === TokenType.EOF;
  }
  private peek(): Token {
    return this.tokens[this.pos];
  }
  private previous(): Token {
    return this.tokens[this.pos - 1];
  }
  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }
  private match(...kinds: TokenType[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  private check(kind: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().kind === kind;
  }
  private consume(expected: TokenType, message: string): Token {
    if (this.check(expected)) return this.advance();
    throw new Error(message);
  }
  private getPrecedence(kind: TokenType): Precedence {
    switch (kind) {
      case TokenType.EQUALS:
        return Precedence.ASSIGN;
      case TokenType.OR:
        return Precedence.OR;
      case TokenType.AND:
        return Precedence.AND;
      case TokenType.EQUALS_EQUALS:
      case TokenType.NOT_EQUALS:
        return Precedence.EQUALS;
      case TokenType.LESS_THAN:
      case TokenType.GREATER_THAN:
      case TokenType.LESS_THAN_OR_EQUALS:
      case TokenType.GREATER_THAN_OR_EQUALS:
        return Precedence.COMPARISON;
      case TokenType.PLUS:
      case TokenType.MINUS:
        return Precedence.SUM;
      case TokenType.SLASH:
      case TokenType.ASTERISK:
      case TokenType.PERCENT:
      case TokenType.REMAINDER:
        return Precedence.PRODUCT;
      case TokenType.EXPONENTIATION:
        return Precedence.EXPONENT;
      case TokenType.LPAREN:
        return Precedence.CALL;
      default:
        return Precedence.LOWEST;
    }
  }
  private peekPrecedence(): Precedence {
    return this.getPrecedence(this.peek().kind);
  }

  private inferType(left: Expr, right: Expr): TypesNative {
    if (left.type === "string" || right.type === "string") return "string";
    if (left.type === "float" || right.type === "float") return "float";
    return "int";
  }

  private makeLoc(start: Loc, end: Loc): Loc {
    return { ...start, end: end.end, line_string: start.line_string };
  }
}
