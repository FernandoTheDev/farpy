import {
  AST_FLOAT,
  AST_INT,
  AST_STRING,
  BinaryExpr,
  BinaryLiteral,
  Expr,
  FloatLiteral,
  FunctionDeclaration,
  IntLiteral,
  Program,
  ReturnStatement,
  Stmt,
  StringLiteral,
} from "../frontend/parser/ast.ts";

export class Optimizer {
  public resume(ast: Program): Program {
    const new_ast = {
      kind: "Program",
      value: "null",
      type: "null",
      body: [],
      loc: ast.loc,
    } as Program;

    for (const expr of ast.body!) {
      new_ast.body!.push(this.optimize(expr));
    }

    return new_ast;
  }

  private optimize(expr: Expr | Stmt): Expr | Stmt {
    switch (expr.kind) {
      case "BinaryExpr":
        return this.optimizeBinaryExpr(expr as BinaryExpr);
      case "VariableDeclaration":
        return this.optimizeVariableDeclaration(expr as any);
      case "FunctionDeclaration":
        return this.optimizeFnDeclaration(expr as FunctionDeclaration);
      case "CallExpr":
        return this.optimizeCallExpr(expr as any);
      case "IncrementExpr":
      case "DecrementExpr":
        return this.optimizeUnaryExpr(expr as any);
      case "ReturnStatement":
        return this.optimizeReturnStatement(expr as ReturnStatement);
      case "IntLiteral":
      case "FloatLiteral":
      case "StringLiteral":
      case "BinaryLiteral":
      case "NullLiteral":
      case "Identifier":
      case "ImportStatement":
        return expr;
      default:
        console.warn("Unknown expression kind in optimizer: " + expr.kind);
        return expr;
    }
  }

  private optimizeReturnStatement(
    retStatement: ReturnStatement,
  ): ReturnStatement {
    retStatement.expr = this.optimize(retStatement.expr);
    return retStatement;
  }

  private optimizeFnDeclaration(
    fnDecl: FunctionDeclaration,
  ): FunctionDeclaration {
    const body = fnDecl.block;
    fnDecl.block = [];

    for (const expr of body) {
      fnDecl.block.push(this.optimize(expr));
    }

    return fnDecl;
  }

  private optimizeVariableDeclaration(varDecl: any): any {
    varDecl.value = this.optimize(varDecl.value);
    return varDecl;
  }

  private optimizeCallExpr(callExpr: any): any {
    callExpr.arguments = callExpr.arguments.map((arg: Expr | Stmt) =>
      this.optimize(arg)
    );
    return callExpr;
  }

  private optimizeUnaryExpr(unaryExpr: any): any {
    unaryExpr.value = this.optimize(unaryExpr.value);
    return unaryExpr;
  }

  private optimizeBinaryExpr(expr: BinaryExpr): Expr {
    const left = this.optimize(expr.left) as Expr;
    const right = this.optimize(expr.right) as Expr;

    if (this.isLiteral(left) && this.isLiteral(right)) {
      return this.evaluateBinaryExpr(left, right, expr.operator, expr.loc);
    }

    return {
      ...expr,
      left,
      right,
    } as BinaryExpr;
  }

  private isLiteral(expr: Expr): boolean {
    return (
      expr.kind === "IntLiteral" ||
      expr.kind === "FloatLiteral" ||
      expr.kind === "StringLiteral" ||
      expr.kind === "BinaryLiteral" ||
      expr.kind === "NullLiteral"
    );
  }

  private identifyNumberType(
    left: Expr,
    right: Expr,
  ): { isInt: boolean; leftValue: number; rightValue: number } {
    const leftValue = this.getLiteralValue(left);
    const rightValue = this.getLiteralValue(right);
    const isInt = left.kind === "IntLiteral" && right.kind === "IntLiteral";

    return { isInt, leftValue, rightValue };
  }

  private getLiteralValue(expr: Expr): number {
    switch (expr.kind) {
      case "IntLiteral":
        return (expr as IntLiteral).value;
      case "FloatLiteral":
        return (expr as FloatLiteral).value;
      case "BinaryLiteral":
        return parseInt((expr as BinaryLiteral).value.replace(/^0b/, ""), 2);
      default:
        return 0;
    }
  }

  private evaluateBinaryExpr(
    left: Expr,
    right: Expr,
    operator: string,
    loc: any,
  ): BinaryExpr | Expr {
    if (this.isNumericLiteral(left) && this.isNumericLiteral(right)) {
      return this.evaluateNumericOperation(left, right, operator, loc);
    }

    if (left.kind === "StringLiteral" && right.kind === "StringLiteral") {
      return this.evaluateStringOperation(
        left as StringLiteral,
        right as StringLiteral,
        operator,
        loc,
      );
    }

    return {
      kind: "BinaryExpr",
      type: left.type,
      left,
      right,
      operator,
      loc,
    } as BinaryExpr;
  }

  private isNumericLiteral(expr: Expr): boolean {
    return expr.kind === "IntLiteral" || expr.kind === "FloatLiteral";
  }

  private evaluateNumericOperation(
    left: Expr,
    right: Expr,
    operator: string,
    loc: any,
  ): BinaryExpr | Expr {
    const { isInt, leftValue, rightValue } = this.identifyNumberType(
      left,
      right,
    );

    // Operations for numbers (both int and float)
    switch (operator) {
      case "+":
        return isInt
          ? AST_INT(leftValue + rightValue, loc)
          : AST_FLOAT(leftValue + rightValue, loc);
      case "-":
        return isInt
          ? AST_INT(leftValue - rightValue, loc)
          : AST_FLOAT(leftValue - rightValue, loc);
      case "*":
        return isInt
          ? AST_INT(leftValue * rightValue, loc)
          : AST_FLOAT(leftValue * rightValue, loc);
      case "/":
        if (rightValue === 0) {
          throw new Error("Division by zero detected during optimization");
        }
        // Division always returns float unless we are doing explicit integer division
        return isInt
          ? AST_INT(Math.floor(leftValue / rightValue), loc)
          : AST_FLOAT(leftValue / rightValue, loc);
      case "%":
        if (rightValue === 0) {
          throw new Error("Modulo by zero detected during optimization");
        }
        return AST_INT(leftValue % rightValue, loc);
      case "**":
        return isInt
          ? AST_INT(Math.pow(leftValue, rightValue), loc)
          : AST_FLOAT(Math.pow(leftValue, rightValue), loc);
      // Bitwise operations are only valid for integers
      case "<<":
        return AST_INT(leftValue << rightValue, loc);
      case ">>":
        return AST_INT(leftValue >> rightValue, loc);
      case "&":
        return AST_INT(leftValue & rightValue, loc);
      case "|":
        return AST_INT(leftValue | rightValue, loc);
      case "^":
        return AST_INT(leftValue ^ rightValue, loc);
      // Comparison operations always return integers (like booleans)
      case "==":
        return AST_INT(leftValue === rightValue ? 1 : 0, loc);
      case "!=":
        return AST_INT(leftValue !== rightValue ? 1 : 0, loc);
      case "<":
        return AST_INT(leftValue < rightValue ? 1 : 0, loc);
      case "<=":
        return AST_INT(leftValue <= rightValue ? 1 : 0, loc);
      case ">":
        return AST_INT(leftValue > rightValue ? 1 : 0, loc);
      case ">=":
        return AST_INT(leftValue >= rightValue ? 1 : 0, loc);
      default:
        // Operator not supported, returns original expression
        return {
          kind: "BinaryExpr",
          type: left.type,
          left,
          right,
          operator,
          loc,
        } as BinaryExpr;
    }
  }

  private evaluateStringOperation(
    left: StringLiteral,
    right: StringLiteral,
    operator: string,
    loc: any,
  ): BinaryExpr | Expr {
    const leftValue = left.value;
    const rightValue = right.value;

    switch (operator) {
      case "+":
        return AST_STRING(leftValue + rightValue, loc);
      case "==":
        return AST_INT(leftValue === rightValue ? 1 : 0, loc);
      case "!=":
        return AST_INT(leftValue !== rightValue ? 1 : 0, loc);
      default:
        // Operator not supported for strings, returns the original expression
        return {
          kind: "BinaryExpr",
          type: left.type,
          left,
          right,
          operator,
          loc,
        } as BinaryExpr;
    }
  }
}
