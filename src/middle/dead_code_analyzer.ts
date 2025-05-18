/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import {
  createTypeInfo,
  Expr,
  FunctionDeclaration,
  Program,
  Stmt,
  VariableDeclaration,
} from "../frontend/parser/ast.ts";
import { Semantic } from "./semantic.ts";

export class DeadCodeAnalyzer {
  public constructor(
    private semantic: Semantic,
    private readonly reporter: DiagnosticReporter,
  ) {}

  public analyze(ast: Program): Program {
    const new_ast = {
      kind: "Program",
      value: "null",
      type: createTypeInfo("null"),
      body: [],
      loc: ast.loc,
    } as Program;

    for (const expr of ast.body!) {
      const validate = this.check(expr);
      if (validate == null) continue;
      new_ast.body!.push(validate);
    }

    return new_ast;
  }

  private check(expr: Expr | Stmt): Expr | Stmt | null {
    switch (expr.kind) {
      case "VariableDeclaration":
        return this.checkVarDeclaration(expr as VariableDeclaration);
      case "FunctionDeclaration":
        return this.checkFnDeclaration(expr as FunctionDeclaration);
      default:
        return expr;
    }
  }

  private checkFnDeclaration(
    fnDecl: FunctionDeclaration,
  ): FunctionDeclaration | null {
    if (this.semantic.identifiersUsed.has(fnDecl.id.value)) {
      return fnDecl;
    }

    this.reporter.addWarning(fnDecl.id.loc, "Unused function declaration", [
      this.reporter.makeSuggestion("Remove unused function declaration"),
    ]);

    return null;
  }

  private checkVarDeclaration(
    varDecl: VariableDeclaration,
  ): VariableDeclaration | null {
    if (this.semantic.identifiersUsed.has(varDecl.id.value)) {
      return varDecl;
    }

    this.reporter.addWarning(varDecl.loc, "Unused variable declaration", [
      this.reporter.makeSuggestion("Remove unused variable declaration"),
    ]);

    return null;
  }
}
