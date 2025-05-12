/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { SymbolInfo } from "../../middle/semantic.ts";
import { Loc } from "../lexer/token.ts";
import { TypesNative } from "../values.ts";
import { Define, Function } from "./cparser.ts";

export enum LLVMType {
  I1 = "i1", // Bool (1 bit)
  I8 = "i8", // Byte (8 bits)
  I16 = "i16", // Short (16 bits)
  I32 = "i32", // Int (32 bits)
  I64 = "i64", // Long (64 bits)
  I128 = "i128", // Long (128 bits)

  FLOAT = "float",
  DOUBLE = "double",

  VOID = "void",
  LABEL = "label",
  PTR = "ptr",

  STRING = "i8*",
}

export type NodeType =
  | "Program"
  | "BinaryExpr"
  | "IncrementExpr"
  | "DecrementExpr"
  | "Identifier"
  | "StringLiteral"
  | "IntLiteral"
  | "NullLiteral"
  | "BooleanLiteral"
  | "FloatLiteral"
  | "BinaryLiteral"
  | "VariableDeclaration"
  | "CallExpr"
  | "ImportStatement"
  | "FunctionDeclaration"
  | "ReturnStatement"
  | "AssignmentDeclaration"
  | "IfStatement"
  | "ElseStatement"
  | "ElifStatement"
  | "ForRangeStatement"
  | "ForCStyleStatement"
  | "ArrowExpression"
  | "StructStatement"
  | "ExternStatement"
  | "WhileStatement"
  | "UnaryExpr";

export interface Stmt {
  kind: NodeType;
  type: TypesNative | TypesNative[];
  // deno-lint-ignore no-explicit-any
  value: any;
  loc: Loc;
  llvmType?: LLVMType;
}

export interface Expr extends Stmt {}

export interface Program extends Stmt {
  kind: "Program";
  type: "null";
  body?: Stmt[];
}

export interface BinaryExpr extends Expr {
  kind: "BinaryExpr";
  left: Expr;
  right: Expr;
  operator: string;
}

export interface IncrementExpr extends Expr {
  kind: "IncrementExpr";
  value: Expr;
}

export interface DecrementExpr extends Expr {
  kind: "DecrementExpr";
  value: Expr;
}

export interface VariableDeclaration extends Stmt {
  kind: "VariableDeclaration";
  id: Identifier;
  value: Expr;
  type: TypesNative | TypesNative[];
  mutable: boolean;
  loc: Loc;
}

export interface AssignmentDeclaration extends Stmt {
  kind: "AssignmentDeclaration";
  id: Identifier;
  value: Expr;
  type: TypesNative | TypesNative[];
  loc: Loc;
}

export interface Identifier extends Expr {
  kind: "Identifier";
  value: string;
}

export function AST_IDENTIFIER(id: string, loc: Loc): Identifier {
  return {
    kind: "Identifier",
    type: "id",
    value: id,
    loc: loc,
  } as Identifier;
}

export interface StringLiteral extends Expr {
  kind: "StringLiteral";
  value: string;
}

export function AST_STRING(str: string, loc: Loc): StringLiteral {
  return {
    kind: "StringLiteral",
    type: "string",
    value: str,
    loc: loc,
  } as StringLiteral;
}

export interface IntLiteral extends Expr {
  kind: "IntLiteral";
  value: number;
}

export function AST_INT(n: number = 0, loc: Loc): IntLiteral {
  return {
    kind: "IntLiteral",
    type: "int",
    value: n,
    loc: loc,
  } as IntLiteral;
}

export interface FloatLiteral extends Expr {
  kind: "FloatLiteral";
  value: number;
}

export function AST_FLOAT(n: number = 0, loc: Loc): FloatLiteral {
  return {
    kind: "FloatLiteral",
    type: "float",
    value: n,
    loc: loc,
  } as FloatLiteral;
}

export interface BinaryLiteral extends Expr {
  kind: "BinaryLiteral";
  value: string;
}

export function AST_BINARY(n: string = "0b0", loc: Loc): BinaryLiteral {
  return {
    kind: "BinaryLiteral",
    type: "binary",
    value: n,
    loc: loc,
  } as BinaryLiteral;
}

export interface NullLiteral extends Expr {
  kind: "NullLiteral";
  value: null;
}

export function AST_NULL(loc: Loc): NullLiteral {
  return {
    kind: "NullLiteral",
    type: "null",
    value: null,
    loc: loc,
  } as NullLiteral;
}

export interface BooleanLiteral extends Expr {
  kind: "BooleanLiteral";
  value: boolean;
}

export function AST_BOOL(value: boolean, loc: Loc): BooleanLiteral {
  return {
    kind: "BooleanLiteral",
    type: "bool",
    value: value,
    loc: loc,
  } as BooleanLiteral;
}

export interface CallExpr extends Expr {
  kind: "CallExpr";
  callee: Identifier;
  type: TypesNative | TypesNative[];
  arguments: Expr[] | Stmt[];
}

export interface ImportStatement extends Stmt {
  kind: "ImportStatement";
  path: StringLiteral;
  isStdLib: boolean;
}

export interface FunctionArgs {
  id: Identifier;
  type: TypesNative | TypesNative[];
  default?: Expr;
  llvmType?: LLVMType;
}

export interface FunctionDeclaration extends Stmt {
  kind: "FunctionDeclaration";
  type: TypesNative | TypesNative[];
  args: FunctionArgs[];
  id: Identifier;
  block: Stmt[];
  scope?: Map<string, SymbolInfo>;
}

export interface ReturnStatement extends Stmt {
  kind: "ReturnStatement";
  expr: Expr;
}

export interface IfStatement extends Stmt {
  kind: "IfStatement" | "ElifStatement";
  type: TypesNative | TypesNative[]; // Type of return if exists
  value: Expr | Expr[] | Stmt; // Value of return if exists
  condition: Expr | Expr[];
  primary: Stmt[]; // if {} | elif {}
  secondary: ElifStatement | ElseStatement | null; // else {} | elif {}
}

export interface ElifStatement extends IfStatement {
  kind: "ElifStatement";
}

export interface ElseStatement extends Stmt {
  kind: "ElseStatement";
  type: TypesNative | TypesNative[];
  value: Expr | Expr[] | Stmt;
  primary: Stmt[];
}

export interface ForRangeStatement extends Stmt {
  kind: "ForRangeStatement";
  id: Identifier | null; // O `as i`, pode ser null
  from: Expr; // início do range
  to: Expr; // fim do range
  inclusive: boolean; // `..=` = true, `..` = false
  step?: Expr; // valor de step, se houver
  block: Stmt[]; // corpo do for
}

// TODO
export interface ForCStyleStatement extends Stmt {
  kind: "ForCStyleStatement";
  init?: Stmt; // declaração ou atribuição, pode ser undefined
  condition: Expr; // condição de parada
  update: Expr; // incremento (IncrementExpr, etc.)
  block: Stmt[]; // corpo do for
}

export interface StructStatement extends Stmt {
  kind: "StructStatement";
  name: Identifier;
  body: { id: Identifier; value: Expr }[];
}

export interface ArrowExpression extends Expr {
  kind: "ArrowExpression";
  from: Expr;
  to: Expr;
  struct: Expr;
}

export interface ExternStatement extends Stmt {
  kind: "ExternStatement";
  language: string; // "C", ...
  file?: string;
  includes: string[];
  defines: Define[];
  functions: Function[]; // cparse.ts
  code: string;
}

export interface WhileStatement extends Stmt {
  kind: "WhileStatement";
  condition: Expr;
  block: Stmt[];
}

/**
 * Representa uma expressão unária (como !x, -x, *p, &v)
 */
export interface UnaryExpr extends Expr {
  kind: "UnaryExpr";
  operator: string; // "*", "&", "-", "!"
  operand: Expr;
}

/**
 * Função helper para criar expressões unárias
 */

function inferUnaryType(operator: string, operand: Expr): TypesNative {
  switch (operator) {
    // case "*":
    //   // Desreferenciar um ponteiro dá o tipo base
    //   if (operand.type.toString().startsWith("ptr_")) {
    //     return operand.type.toString().substring(4) as TypesNative;
    //   }
    //   return "null";
    // case "&":
    //   // Referenciar um valor cria um ponteiro para esse tipo
    //   return `ptr_${operand.type}`;
    case "-":
      return operand.type as TypesNative;
    case "!":
      return "bool";
    default:
      return "null";
  }
}

export function AST_UNARY(
  operator: string,
  operand: Expr,
  loc: Loc,
): UnaryExpr {
  return {
    kind: "UnaryExpr",
    operator: operator,
    operand: operand,
    type: inferUnaryType(operator, operand),
    value: null,
    loc,
  };
}
