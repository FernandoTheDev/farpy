/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { TypesNative } from "../values.ts";
import { Loc, Token, TokenType } from "../lexer/token.ts";
import {
  AssignmentDeclaration,
  AST_FLOAT,
  AST_IDENTIFIER,
  AST_INT,
  AST_NULL,
  AST_STRING,
  AST_UNARY,
  BinaryExpr,
  CallExpr,
  ElifStatement,
  ElseStatement,
  Expr,
  ExternStatement,
  ForCStyleStatement,
  ForRangeStatement,
  FunctionArgs,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  ImportStatement,
  NullLiteral,
  Program,
  ReturnStatement,
  Stmt,
  VariableDeclaration,
  WhileStatement,
} from "./ast.ts";
import { DiagnosticReporter } from "../../error/diagnosticReporter.ts";
import { CParser } from "./cparser.ts";

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

  constructor(tokens: Token[], private readonly reporter: DiagnosticReporter) {
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

    try {
      while (!this.isAtEnd()) {
        program.body!.push(this.parseStmt());
      }

      program.loc = this.tokens.length > 0
        ? this.makeLoc(
          this.tokens[0].loc,
          this.tokens[this.tokens.length - 1].loc,
        )
        : {} as Loc;
    } catch (_error: any) {
      // Does nothing here, just lets the error propagate
      // The reporter already contains the recorded errors
    }

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
      case TokenType.NEW:
        return this.parseNewExpression();
      case TokenType.IMPORT:
        return this.parseImportStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      case TokenType.FN:
        return this.parseFnStatement();
      case TokenType.IF:
        return this.parseIfStatement();
      case TokenType.FOR:
        return this.parseForStatement();
      case TokenType.EXTERN:
        return this.parseExternStatement();
      case TokenType.WHILE:
        return this.parseWhileStatement();
      case TokenType.IDENTIFIER: {
        const name = token.value!.toString();
        if (this.peek().kind === TokenType.LPAREN) {
          return this.parseCallExpression(AST_IDENTIFIER(name, token.loc));
        }
        if (this.peek().kind === TokenType.EQUALS) {
          return this.parseAssignment(AST_IDENTIFIER(name, token.loc));
        }

        // cstyle
        // if (
        //   this.peek().kind === TokenType.IDENTIFIER &&
        //   this.next() != false
        // ) {
        //   if ((this.next() as Token).kind === TokenType.EQUALS) {
        //     if (
        //       new TypeChecker(this.reporter).isValidType(
        //         this.peek().value as string,
        //       )
        //     ) {
        //       console
        //       return this.parseCVarDeclaration();
        //     }
        //   }
        // }

        return AST_IDENTIFIER(name, token.loc);
      }
      case TokenType.LPAREN: {
        const expr = this.parseExpression(Precedence.LOWEST);
        this.consume(TokenType.RPAREN, "Expect ')' after expression.");
        return expr;
      }
      case TokenType.ASTERISK: {
        // Operador de desreferenciamento (pode ser múltiplo como ***)
        let count = 1;
        while (this.peek().kind === TokenType.ASTERISK) {
          count++;
          this.advance();
        }

        // Cria um operador desref para cada nível
        let operand = this.parseExpression(Precedence.PREFIX);
        for (let i = 0; i < count; i++) {
          operand = AST_UNARY(
            "*",
            operand,
            this.makeLoc(token.loc, operand.loc),
          );
        }
        return operand;
      }

      case TokenType.AMPERSAND: {
        const operand = this.parseExpression(Precedence.PREFIX);
        return AST_UNARY("&", operand, this.makeLoc(token.loc, operand.loc));
      }

      case TokenType.MINUS: {
        const operand = this.parseExpression(Precedence.PREFIX);
        return AST_UNARY("-", operand, this.makeLoc(token.loc, operand.loc));
      }

      case TokenType.BANG: {
        const operand = this.parseExpression(Precedence.PREFIX);
        return AST_UNARY("!", operand, this.makeLoc(token.loc, operand.loc));
      }
      default:
        this.reporter.addError(
          token.loc,
          `No prefix parse function for '${token.value}'.`,
        );
        throw new Error(`No prefix parse function for ${token.value}`);
    }
  }

  private parseWhileStatement(): WhileStatement {
    const start = this.previous();
    const body: Expr[] = [];
    const condition = this.parseExpression(Precedence.LOWEST);

    this.consume(
      TokenType.LBRACE,
      "A '{' was expected to start the for block.",
    );

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseExpression(Precedence.LOWEST));
    }

    this.consume(
      TokenType.RBRACE,
      "A '}' was expected to close the for block.",
    );

    return {
      kind: "WhileStatement",
      condition: condition,
      block: body,
      type: "void",
      value: "void",
      loc: this.makeLoc(start.loc, condition.loc),
    };
  }

  private parseExternStatement(): ExternStatement {
    const start = this.previous();
    const language = this.consume(
      TokenType.STRING,
      "A string is expected to identify the target language.",
    );

    if (this.match(TokenType.FROM)) {
      const filename = this.consume(
        TokenType.STRING,
        "A string is expected for the target file name.",
      );

      const filePath = filename.loc.dir + filename.value;
      let source = "";

      try {
        source = Deno.readTextFileSync(
          filePath,
        );
      } catch (_error) {
        this.reporter.addError(
          filename.loc,
          `File '${filePath}' not found`,
        );
        throw new Error(`File '${filePath}' not found`);
      }

      const cparserValue = new CParser().parseString(source);

      return {
        kind: "ExternStatement",
        functions: cparserValue.functions,
        defines: cparserValue.defines,
        includes: cparserValue.includes,
        language: language.value as string,
        type: "void",
        value: "void",
        code: source,
        loc: this.makeLoc(start.loc, filename.loc),
      } as ExternStatement;
    }

    const end = this.consume(
      TokenType.START,
      "Expected 'start' after language target.",
    );
    const source: string[] = [];
    let last_line: number = 0;

    while (!this.isAtEnd() && this.peek().kind != TokenType.END) {
      const peek = this.advance();

      if (peek.loc.line > last_line) {
        last_line = peek.loc.line;
        source.push(peek.loc.line_string as string);
      }
    }

    const src = source.join("\n");
    const cparserValue = new CParser().parseString(src);

    this.consume(
      TokenType.END,
      "Expected 'end' after block code.",
    );

    return {
      kind: "ExternStatement",
      functions: cparserValue.functions,
      defines: cparserValue.defines,
      includes: cparserValue.includes,
      language: language.value as string,
      type: "void",
      value: "void",
      code: src,
      loc: this.makeLoc(start.loc, end.loc),
    } as ExternStatement;
  }

  private parseCVarDeclaration(): VariableDeclaration {
    const start = this.previous();
    const type = start.value as TypesNative; // Type
    const mutable: boolean = false;
    const id = this.consume(
      TokenType.IDENTIFIER,
      "Expected identifier to variable name.",
    );

    this.consume(TokenType.EQUALS, "Expected '=' after variable name.");
    const expr = this.parseExpression(Precedence.LOWEST);
    const loc = this.makeLoc(start.loc, expr.loc);

    return {
      kind: "VariableDeclaration",
      id: AST_IDENTIFIER(id.value!.toString(), id.loc),
      type: type,
      value: expr,
      mutable: mutable,
      loc: loc,
    } as VariableDeclaration;
  }

  // private parseArrowExpression();

  private parseForStatement(): ForRangeStatement | ForCStyleStatement {
    const start = this.previous();
    const from = this.advance();

    if (from.kind != TokenType.INT) {
      this.reporter.addError(from.loc, "An IntLiteral was expected");
      throw new Error("An IntLiteral was expected");
    }

    this.consume(TokenType.RANGE, "'..' was expected after the literal.");

    let inclusive = false;
    let step: null | Token = null;
    let id: null | Token = null;
    const body: Stmt[] = [];

    if (this.match(TokenType.EQUALS)) {
      inclusive = true;
    }

    if (
      this.peek().kind != TokenType.INT &&
      this.peek().kind != TokenType.IDENTIFIER
    ) {
      // Error
      this.reporter.addError(
        this.peek().loc,
        "A literal or identifier after the '..' was expected.",
      );
      throw Error("A literal or identifier after the '..' was expected.");
    }

    const to = this.advance();
    let negative = false;

    if (this.match(TokenType.STEP)) {
      negative = this.match(TokenType.MINUS);
      step = this.consume(
        TokenType.INT,
        "An integer was expected for the step value.",
      );
    }

    if (this.match(TokenType.AS)) {
      id = this.consume(
        TokenType.IDENTIFIER,
        "An identifier was expected.",
      );
    }

    this.consume(
      TokenType.LBRACE,
      "A '{' was expected to start the for block.",
    );

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseExpression(Precedence.LOWEST));
    }

    const end = this.consume(
      TokenType.RBRACE,
      "A '}' was expected to close the for block.",
    );

    return {
      kind: "ForRangeStatement",
      id: id,
      step: step != null
        ? AST_INT(
          negative == false ? Number(step!.value) : -Number(step!.value),
          step!.loc,
        )
        : null,
      from: AST_INT(Number(from.value), from.loc),
      to: to.kind == TokenType.INT
        ? AST_INT(Number(to.value), to.loc)
        : AST_IDENTIFIER(String(to.value), to.loc),
      inclusive: inclusive,
      block: body,
      type: "null",
      value: AST_NULL({} as Loc),
      loc: this.makeLoc(start.loc, end.loc),
    } as ForRangeStatement;
  }

  private parseIfStatement(miaKhalifa: boolean = true): IfStatement {
    const start = this.previous();
    const condition = this.parseExpression(Precedence.LOWEST);

    this.consume(TokenType.LBRACE, "Expected '{' after condition.");
    let returnStmt: ReturnStatement | NullLiteral = AST_NULL({} as Loc);

    const body: Stmt[] = [];
    // @ts-ignore
    let bodySecond: ElifStatement | ElseStatement | null = null;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.peek().kind == TokenType.RETURN) {
        returnStmt = this.parseExpression(
          Precedence.LOWEST,
        ) as ReturnStatement;
        body.push(returnStmt);
        break;
      }
      body.push(this.parseExpression(Precedence.LOWEST));
    }

    const end = this.consume(
      TokenType.RBRACE,
      "Expect '}' after function body.",
    );

    if (this.match(TokenType.ELIF)) {
      // @ts-ignore
      bodySecond = this.parseIfStatement(false);
    }

    if (this.match(TokenType.ELSE)) {
      bodySecond = this.parseElseStatement();
    }

    return {
      kind: miaKhalifa ? "IfStatement" : "ElifStatement",
      type: returnStmt.type ?? "void",
      value: returnStmt.value ?? "void",
      condition: condition,
      primary: body,
      secondary: bodySecond,
      loc: this.makeLoc(start.loc, end.loc),
    } as IfStatement;
  }

  private parseElseStatement(): ElseStatement {
    const start = this.previous();

    this.consume(TokenType.LBRACE, "Expected '{' after 'else'.");
    let returnStmt: ReturnStatement | NullLiteral = AST_NULL({} as Loc);

    const body: Stmt[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.peek().kind == TokenType.RETURN) {
        returnStmt = this.parseExpression(
          Precedence.LOWEST,
        ) as ReturnStatement;
        body.push(returnStmt);
        break;
      }
      body.push(this.parseExpression(Precedence.LOWEST));
    }

    const end = this.consume(
      TokenType.RBRACE,
      "Expect '}' after function body.",
    );

    return {
      kind: "ElseStatement",
      type: returnStmt.type,
      value: returnStmt.value,
      primary: body,
      loc: this.makeLoc(start.loc, end.loc),
    } as ElseStatement;
  }

  private parseAssignment(id: Identifier): AssignmentDeclaration {
    this.consume(TokenType.EQUALS, "Expect '=' after identifier.");
    const expr = this.parseExpression(Precedence.LOWEST);
    const type = expr.type;

    return {
      kind: "AssignmentDeclaration",
      id: id,
      type: type,
      value: expr,
      loc: this.makeLoc(id.loc, expr.loc),
    } as AssignmentDeclaration;
  }

  private parseFnStatement(): FunctionDeclaration {
    const start = this.previous();
    const id = this.consume(
      TokenType.IDENTIFIER,
      "Expect identifier to function name.",
    );

    // Parse arguments
    const args = this.parse_function_arguments();

    // Parse optional return type
    let returnType: TypesNative | TypesNative[] = "void"; // Default return type
    if (this.match(TokenType.COLON)) {
      // Parse return type (supporting union types)
      const returnTypes: TypesNative[] = [];
      const firstTypeToken = this.consume(
        TokenType.IDENTIFIER,
        "Expected return type.",
      );
      returnTypes.push(firstTypeToken.value as TypesNative);

      while (this.peek().kind === TokenType.PIPE) {
        this.advance(); // Skip |
        const typeToken = this.consume(
          TokenType.IDENTIFIER,
          "Expected type after '|'.",
        );
        returnTypes.push(typeToken.value as TypesNative);
      }

      returnType = returnTypes.length === 1 ? returnTypes[0] : returnTypes;
    }

    this.consume(TokenType.LBRACE, "Expect '{' before function body.");
    const body: Stmt[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      body.push(this.parseExpression(Precedence.LOWEST));
    }
    const end = this.consume(
      TokenType.RBRACE,
      "Expect '}' after function body.",
    );

    return {
      kind: "FunctionDeclaration",
      id: AST_IDENTIFIER(id.value as string, id.loc),
      args: args,
      type: returnType,
      block: body,
      loc: this.makeLoc(start.loc, end.loc),
    } as FunctionDeclaration;
  }

  private parse_function_arguments(): FunctionArgs[] {
    const args: FunctionArgs[] = [];
    this.consume(
      TokenType.LPAREN,
      "Expect '(' after function name.",
    );

    while (this.peek().kind !== TokenType.RPAREN) {
      const argToken: Token = this.consume(
        TokenType.IDENTIFIER,
        "Expected ID for argument name.",
      );
      const argId: Identifier = AST_IDENTIFIER(
        argToken.value as string,
        argToken.loc,
      );

      let argType: TypesNative | TypesNative[] = "id";
      let defaultValue: Expr | undefined = undefined;

      this.consume(TokenType.COLON, "Expect ':' after argument name.");
      // Parse argument type (supporting union types)
      const argTypes: TypesNative[] = [];
      const firstTypeToken = this.consume(
        TokenType.IDENTIFIER,
        "Expected type for argument.",
      );
      argTypes.push(firstTypeToken.value as TypesNative);

      while (this.peek().kind === TokenType.PIPE) {
        this.advance(); // Skip '|'
        const typeToken = this.consume(
          TokenType.IDENTIFIER,
          "Expected type after '|'.",
        );
        argTypes.push(typeToken.value as TypesNative);
      }

      argType = argTypes.length === 1 ? argTypes[0] : argTypes;

      if (this.match(TokenType.EQUALS)) {
        defaultValue = this.parseExpression(Precedence.LOWEST);
      }

      args.push({
        id: argId,
        type: argType,
        default: defaultValue,
      });

      if (this.peek().kind === TokenType.COMMA) {
        this.advance(); // skip ','
      } else if (this.peek().kind !== TokenType.RPAREN) {
        this.reporter.addError(
          this.peek().loc,
          "Expected ',' or ')' after argument.",
        );
        throw new Error("Expected ',' or ')' after argument.");
      }
    }

    this.consume(TokenType.RPAREN, "Expected ')' after arguments.");
    return args;
  }

  private parseNewExpression(): VariableDeclaration {
    const start = this.previous();
    const mutable: boolean = this.match(TokenType.MUT);
    const id = this.consume(
      TokenType.IDENTIFIER,
      "Expect identifier to variable name.",
    );
    let assignType = true;
    let type: TypesNative | TypesNative[] = "null";

    if (this.match(TokenType.COLON)) {
      const types: TypesNative[] = [];
      const firstTypeToken = this.consume(
        TokenType.IDENTIFIER,
        "Expected return type.",
      );
      types.push(firstTypeToken.value as TypesNative);

      while (this.peek().kind === TokenType.PIPE) {
        this.advance();
        const typeToken = this.consume(
          TokenType.IDENTIFIER,
          "Expected type after '|'.",
        );
        types.push(typeToken.value as TypesNative);
      }

      type = types.length === 1 ? types[0] : types;
      assignType = false;
    }

    this.consume(TokenType.EQUALS, "Expect '=' after variable name.");
    const expr = this.parseExpression(Precedence.LOWEST);
    if (assignType) type = expr.type;
    const loc = this.makeLoc(start.loc, expr.loc);

    return {
      kind: "VariableDeclaration",
      id: AST_IDENTIFIER(id.value!.toString(), id.loc),
      type: type,
      value: expr,
      mutable: mutable,
      loc: loc,
    } as VariableDeclaration;
  }

  private parseReturnStatement(): ReturnStatement {
    const expr = this.parseExpression(Precedence.LOWEST);

    return {
      kind: "ReturnStatement",
      expr: expr,
      loc: this.makeLoc(this.previous().loc, expr.loc),
    } as ReturnStatement;
  }

  private parseImportStatement(): ImportStatement {
    const path = this.consume(TokenType.STRING, "Expected string in import.");

    const isStdLib = !(path.value as string).includes(".");

    return {
      kind: "ImportStatement",
      type: "null",
      value: null,
      path: AST_STRING(path.value as string, path.loc),
      isStdLib: isStdLib,
      loc: this.makeLoc(this.previous().loc, path.loc),
    } as ImportStatement;
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
      type: "null",
      arguments: args,
      loc: this.makeLoc(callee.loc, paren.loc),
    } as CallExpr;
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
  private next(): Token | boolean {
    if (this.isAtEnd()) return false;
    return this.tokens[this.pos + 1];
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
    const token = this.peek();
    this.reporter.addError(
      token.loc,
      message,
    );

    throw new Error(`Erro de parsing: ${message}`);
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
