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
  ArrayLiteral,
  ArrowExpression,
  AssignmentDeclaration,
  AST_ARRAY,
  AST_BINARY,
  AST_BOOL,
  AST_FLOAT,
  AST_IDENTIFIER,
  AST_INT,
  AST_NULL,
  AST_STRING,
  AST_UNARY,
  BinaryExpr,
  BinaryLiteral,
  CallExpr,
  CastExpr,
  createTypeInfo,
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
  IndexAccess,
  NullLiteral,
  PointerAssignment as _PointerAssignment,
  Program,
  ReturnStatement,
  Stmt,
  StructExpr,
  StructPAssignment,
  StructProperties,
  StructStatement,
  TypeInfo,
  VariableDeclaration,
  WhileStatement,
} from "./ast.ts";
import { DiagnosticReporter } from "../../error/diagnosticReporter.ts";
import { CParser } from "./cparser.ts";
import { ParseType } from "./parse_type.ts";

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

  public parse(): Program {
    const program: Program = {
      kind: "Program",
      type: createTypeInfo("null"),
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
    } catch (_error: unknown) {
      console.log("Err", _error);
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
    this.match(TokenType.SEMICOLON);
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
      case TokenType.TRUE:
        return AST_BOOL(true, token.loc);
      case TokenType.FALSE:
        return AST_BOOL(false, token.loc);
      case TokenType.NULL:
      case TokenType.EOF:
        return AST_NULL(token.loc);
      case TokenType.BINARY:
        return this.parseBinaryLiteral();
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
      case TokenType.LBRACKET:
        return this.parseArrayLiteral();
      case TokenType.IDENTIFIER: {
        const name = token.value!.toString();
        if (this.peek().kind === TokenType.LPAREN) {
          return this.parseCallExpression(AST_IDENTIFIER(name, token.loc));
        }
        if (this.peek().kind === TokenType.EQUALS) {
          return this.parseAssignment(AST_IDENTIFIER(name, token.loc));
        }
        // TODO: I need to check this better
        // I can only create a struct in a variable declaration for now
        if (
          this.peek().kind === TokenType.LBRACE &&
          this.previous(2).kind == TokenType.EQUALS
        ) {
          return this.parseStructExpr();
        }
        if (this.peek().kind === TokenType.LBRACKET) {
          return this.parseIndexAccess();
        }
        if (this.peek().kind === TokenType.DOT) {
          return this.parseArrowExpression();
        }
        return AST_IDENTIFIER(name, token.loc);
      }
      case TokenType.LPAREN:
        return this.parseCastExpression();
      case TokenType.ASTERISK:
      case TokenType.EXPONENTIATION: {
        let count = 1;

        if (token.kind == TokenType.EXPONENTIATION) {
          count++;
        }

        while (
          this.peek().kind === TokenType.ASTERISK ||
          this.peek().kind === TokenType.EXPONENTIATION
        ) {
          if (this.peek().kind === TokenType.EXPONENTIATION) {
            count += 2;
          } else {
            count++;
          }
          this.advance();
        }

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
      case TokenType.STRUCT:
        return this.parseStructStatement();
      default:
        this.reporter.addError(
          token.loc,
          `No prefix parse function for '${token.value}'.`,
        );
        throw new Error(`No prefix parse function for ${token.value}`);
    }
  }

  private parseArrowExpression(): ArrowExpression | StructPAssignment {
    const name = this.previous();
    this.consume(TokenType.DOT, "Expected '.' for struct access propertie.");
    const propertie = this.parseExpression(Precedence.LOWEST);

    if (propertie.kind == "Identifier") {
      return {
        kind: "ArrowExpression",
        from: AST_IDENTIFIER(String(name.value), name.loc),
        to: propertie,
        type: createTypeInfo("void"),
        value: null,
        loc: this.makeLoc(name.loc, propertie.loc),
      } as ArrowExpression;
    }

    if (propertie.kind == "AssignmentDeclaration") {
      return {
        kind: "StructPAssignment",
        from: AST_IDENTIFIER(String(name.value), name.loc),
        to: propertie,
        type: createTypeInfo("void"),
        value: null,
        loc: this.makeLoc(name.loc, propertie.loc),
      } as StructPAssignment;
    }

    this.reporter.addError(
      propertie.loc,
      `Unexpected kind of expr in arrow expression '${propertie.kind}'.`,
    );
    throw new Error(
      `Unexpected kind of expr in arrow expression '${propertie.kind}'.`,
    );
  }

  private parseIndexAccess(): IndexAccess {
    const element = this.previous();

    this.consume(TokenType.LBRACKET, "Expected '[' in index access.");

    const index = this.parseExpression(Precedence.LOWEST);

    this.consume(TokenType.RBRACKET, "Expected '[' after index access.");

    return {
      kind: "IndexAccess",
      index: index,
      target: AST_IDENTIFIER(String(element.value), element.loc),
      loc: this.makeLoc(element.loc, element.loc),
      type: index.type,
      value: null,
    } as IndexAccess;
  }

  private parseStructExpr(): StructExpr {
    const name = this.previous();

    this.consume(TokenType.LBRACE, "Expected '{' after struct name.");

    // { id: Identifier; value: Expr; type: TypeInfo }[]
    const body: StructProperties[] = [];
    let i = 0;

    while (this.peek().kind != TokenType.RBRACE && !this.isAtEnd()) {
      const id = this.consume(
        TokenType.IDENTIFIER,
        "Expected ID to name of propertie in struct.",
      );

      this.consume(TokenType.COLON, "Expected ':' after propertie name.");

      while (
        this.peek().kind != TokenType.COMMA &&
        this.peek().kind != TokenType.RBRACE
      ) {
        const expr = this.parseExpression(Precedence.LOWEST);
        body.push({
          id: AST_IDENTIFIER(String(id.value), id.loc),
          value: expr,
          type: expr.type,
          index: i,
        });
      }

      i++;
      this.match(TokenType.COMMA);
      // this.consume(TokenType.COMMA, "Expected ',' after type.");
    }

    this.consume(TokenType.RBRACE, "Expected '}' after struct statement.");

    return {
      kind: "StructExpr",
      name: AST_IDENTIFIER(String(name.value), name.loc),
      body: body,
      type: createTypeInfo(String(name.value), true),
      loc: this.makeLoc(name.loc, name.loc),
    } as StructExpr;
  }

  private parseStructStatement(): StructStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "An ID was expected for the struct name.",
    );

    this.consume(TokenType.LBRACE, "Expected '{' after struct name.");

    // { id: Identifier; value: Expr; type: TypeInfo }[]
    const body: StructProperties[] = [];
    let i = 0;

    while (this.peek().kind != TokenType.RBRACE && !this.isAtEnd()) {
      const id = this.consume(
        TokenType.IDENTIFIER,
        "Expected ID to name of propertie in struct.",
      );

      this.consume(TokenType.COLON, "Expected ':' after propertie name.");

      const tokens: Token[] = [];

      while (this.peek().kind != TokenType.SEMICOLON) {
        tokens.push(this.advance());
      }

      const type = new ParseType(tokens).parse();
      body.push({
        id: AST_IDENTIFIER(String(id.value), id.loc),
        type: type,
        index: i,
      });
      i++;
      this.consume(TokenType.SEMICOLON, "Expected ';' after type.");
    }

    this.consume(TokenType.RBRACE, "Expected '}' after struct statement.");

    return {
      kind: "StructStatement",
      name: AST_IDENTIFIER(String(name.value), name.loc),
      body: body,
      type: createTypeInfo(String(name.value), true),
      loc: this.makeLoc(name.loc, name.loc),
    } as StructStatement;
  }

  private parseBinaryLiteral(): BinaryLiteral {
    const token: Token = this.previous();
    if (/^(0b[01]+|[01]+b)$/.test(token.value as string) == false) {
      this.reporter.addError(token.loc, `Invalid binary value.`);
      throw new Error("Invalid binary value.");
    }
    return AST_BINARY(token.value as string, token.loc);
  }

  private parseCastExpression(): Expr {
    const startLoc = this.previous().loc;
    const savedPos = this.pos;

    const typeTokens: Token[] = [];

    let nestingLevel = 0;
    let foundClosingParen = false;
    let hasOperators = false;

    while (!this.isAtEnd()) {
      if (this.check(TokenType.LPAREN)) {
        nestingLevel++;
      } else if (this.check(TokenType.RPAREN)) {
        if (nestingLevel === 0) {
          foundClosingParen = true;
          break;
        }
        nestingLevel--;
      } else if (
        this.check(TokenType.PLUS) ||
        this.check(TokenType.MINUS) ||
        this.check(TokenType.SLASH) ||
        this.check(TokenType.PERCENT) ||
        this.check(TokenType.REMAINDER) ||
        this.check(TokenType.EXPONENTIATION)
      ) {
        hasOperators = true;
      }

      typeTokens.push(this.advance());
    }

    if (!foundClosingParen) {
      this.pos = savedPos;
      const expr = this.parseExpression(Precedence.LOWEST);
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return expr;
    }

    this.consume(TokenType.RPAREN, "Expect ')' after type cast.");

    // Heuristics to distinguish between cast and mathematical expression

    if (typeTokens.length > 3) {
      hasOperators = true;
    }

    if (hasOperators) {
      this.pos = savedPos;
      const expr = this.parseExpression(Precedence.LOWEST);
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return expr;
    }

    const nextTokenIsValidCastTarget =
      this.peek().kind === TokenType.IDENTIFIER ||
      this.peek().kind === TokenType.INT ||
      this.peek().kind === TokenType.FLOAT ||
      this.peek().kind === TokenType.STRING ||
      this.peek().kind === TokenType.AMPERSAND ||
      this.peek().kind === TokenType.ASTERISK ||
      this.peek().kind === TokenType.LPAREN;

    if (!nextTokenIsValidCastTarget) {
      this.pos = savedPos;
      const expr = this.parseExpression(Precedence.LOWEST);
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return expr;
    }

    if (!this.isValidTypeSequence(typeTokens)) {
      this.pos = savedPos;
      const expr = this.parseExpression(Precedence.LOWEST);
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return expr;
    }

    try {
      const castType = new ParseType(typeTokens).parse();
      const expr = this.parseExpression(Precedence.PREFIX);

      return {
        kind: "CastExpr",
        type: castType,
        expr: expr,
        loc: this.makeLoc(startLoc, expr.loc),
        value: null,
      } as CastExpr;
    } catch (_error: unknown) {
      this.pos = savedPos;
      const expr = this.parseExpression(Precedence.LOWEST);
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return expr;
    }
  }

  private isValidTypeSequence(tokens: Token[]): boolean {
    if (tokens.length === 0) return false;
    let pos = 0;

    const parseType = (): boolean => {
      while (pos < tokens.length && tokens[pos].kind === TokenType.ASTERISK) {
        pos++;
      }

      if (
        pos < tokens.length - 1 &&
        tokens[pos].kind === TokenType.LBRACKET &&
        tokens[pos + 1].kind === TokenType.RBRACKET
      ) {
        pos += 2;
        return parseType();
      }

      if (pos < tokens.length && tokens[pos].kind === TokenType.IDENTIFIER) {
        pos++;
        return pos === tokens.length;
      }

      return false;
    };

    return parseType();
  }

  private parseArrayLiteral(): ArrayLiteral {
    const start = this.previous(); // [
    const values: Expr[] = [];

    while (this.peek().kind != TokenType.RBRACKET) {
      values.push(this.parseExpression(Precedence.LOWEST));
      this.match(TokenType.COMMA);
    }

    this.consume(
      TokenType.RBRACKET,
      "Expected ']' to close array.",
    );

    return AST_ARRAY(
      values,
      start.loc,
      values[0] != undefined ? values[0].type : createTypeInfo("null"),
    );
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
      type: createTypeInfo("void"),
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
        type: createTypeInfo("void"),
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
      type: createTypeInfo("void"),
      value: "void",
      code: src,
      loc: this.makeLoc(start.loc, end.loc),
    } as ExternStatement;
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

    if (this.match(TokenType.ARROW)) {
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
      type: createTypeInfo("null"),
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
    // @ts-ignore: Dont have error
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
      // @ts-ignore: Dont have error
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
    let returnType: TypeInfo = createTypeInfo("void"); // Default return type

    if (this.match(TokenType.COLON)) {
      const tokens: Token[] = [];

      while (
        this.peek().kind != TokenType.LBRACE // {
      ) {
        tokens.push(this.advance());
      }

      returnType = new ParseType(tokens).parse();
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

      let argType: TypeInfo = createTypeInfo("id");
      let defaultValue: Expr | undefined = undefined;

      this.consume(TokenType.COLON, "Expect ':' after argument name.");

      const tokens: Token[] = [];

      while (
        this.peek().kind != TokenType.EQUALS && // =
        this.peek().kind != TokenType.COMMA && // ,
        this.peek().kind != TokenType.RPAREN // )
      ) {
        tokens.push(this.advance());
      }

      argType = new ParseType(tokens).parse();

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
    let type: TypeInfo | TypesNative = "null";

    if (this.match(TokenType.COLON)) {
      const tokens: Token[] = [];

      while (this.peek().kind != TokenType.EQUALS) {
        tokens.push(this.advance());
      }

      type = new ParseType(tokens).parse();
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
      type: createTypeInfo("null"),
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
      type: createTypeInfo("null"),
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

    if (
      operatorToken.kind == TokenType.ASTERISK ||
      operatorToken.kind == TokenType.EXPONENTIATION &&
        this.peek().kind == TokenType.IDENTIFIER &&
        (this.next() as Token).kind == TokenType.EQUALS
    ) {
      // this.parsePointerAssignment();
    }

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
  private previous(i: number = 1): Token {
    return this.tokens[this.pos - i];
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

  private inferType(left: Expr, right: Expr): TypeInfo {
    if (left.type.baseType === "string" || right.type.baseType === "string") {
      return createTypeInfo("string");
    }
    if (left.type.baseType === "float" || right.type.baseType === "float") {
      return createTypeInfo("float");
    }
    return createTypeInfo("int");
  }

  private makeLoc(start: Loc, end: Loc): Loc {
    return { ...start, end: end.end, line_string: start.line_string };
  }
}
