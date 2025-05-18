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

export interface TypeInfo {
  baseType: TypesNative;
  isArray: boolean;
  dimensions: number;
  isPointer: boolean;
  pointerLevel: number;
}

export function createTypeInfo(baseType: TypesNative): TypeInfo {
  return {
    baseType,
    isArray: false,
    dimensions: 0,
    isPointer: false,
    pointerLevel: 0,
  };
}

export function createArrayType(
  baseType: TypesNative,
  dimensions: number = 1,
): TypeInfo {
  return {
    baseType,
    isArray: true,
    dimensions,
    isPointer: false,
    pointerLevel: 0,
  };
}

export function createPointerType(
  baseType: TypeInfo,
  pointerLevel: number = 1,
): TypeInfo {
  if (typeof baseType !== "string") {
    baseType.isPointer = true;
    baseType.pointerLevel = baseType.pointerLevel + pointerLevel;
    return baseType;
  }

  return {
    baseType,
    isArray: false,
    dimensions: 0,
    isPointer: true,
    pointerLevel,
  };
}

export function typeInfoToString(type: TypeInfo): string {
  let result = type.baseType;

  if (type.isArray) {
    for (let i = 0; i < type.dimensions; i++) {
      result += "[]";
    }
  }

  if (type.isPointer) {
    result = "*".repeat(type.pointerLevel) + result;
  }

  return result;
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
  | "ArrayLiteral"
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
  | "UnaryExpr"
  | "AddressOfExpr"
  | "DereferenceExpr";

export interface Stmt {
  kind: NodeType;
  type: TypeInfo;
  // deno-lint-ignore no-explicit-any
  value: any;
  loc: Loc;
  llvmType?: LLVMType;
}

export interface Expr extends Stmt {}

export interface Program extends Stmt {
  kind: "Program";
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
  type: TypeInfo;
  mutable: boolean;
  loc: Loc;
}

export interface AssignmentDeclaration extends Stmt {
  kind: "AssignmentDeclaration";
  id: Identifier;
  value: Expr;
  type: TypeInfo;
  loc: Loc;
}

export interface Identifier extends Expr {
  kind: "Identifier";
  value: string;
}

export function AST_IDENTIFIER(id: string, loc: Loc): Identifier {
  return {
    kind: "Identifier",
    type: createTypeInfo("id"),
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
    type: createTypeInfo("string"),
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
    type: createTypeInfo("int"),
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
    type: createTypeInfo("float"),
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
    type: createTypeInfo("binary"),
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
    type: createTypeInfo("null"),
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
    type: createTypeInfo("bool"),
    value: value,
    loc: loc,
  } as BooleanLiteral;
}

export interface ArrayLiteral extends Expr {
  kind: "ArrayLiteral";
  value: Expr[];
  elementType?: TypeInfo; // Tipo dos elementos do array
}

export function AST_ARRAY(
  value: Expr[],
  loc: Loc,
  elementType?: TypeInfo,
): ArrayLiteral {
  if (!elementType && value.length > 0) {
    elementType = value[0].type;
  }

  const arrayTypeInfo = createArrayType(
    elementType?.baseType as TypesNative || "null",
    1,
  );

  return {
    kind: "ArrayLiteral",
    type: arrayTypeInfo,
    value: value,
    elementType: elementType,
    loc: loc,
  } as ArrayLiteral;
}

export interface CallExpr extends Expr {
  kind: "CallExpr";
  callee: Identifier;
  type: TypeInfo;
  arguments: Expr[] | Stmt[];
}

export interface ImportStatement extends Stmt {
  kind: "ImportStatement";
  path: StringLiteral;
  isStdLib: boolean;
}

export interface FunctionArgs {
  id: Identifier;
  type: TypeInfo;
  default?: Expr;
  llvmType?: LLVMType;
}

export interface FunctionDeclaration extends Stmt {
  kind: "FunctionDeclaration";
  type: TypeInfo;
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
  type: TypeInfo;
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
  type: TypeInfo;
  value: Expr | Expr[] | Stmt;
  primary: Stmt[];
}

export interface ForRangeStatement extends Stmt {
  kind: "ForRangeStatement";
  id: Identifier | null;
  from: Expr;
  to: Expr;
  inclusive: boolean; // `..=` = true, `..` = false
  step?: Expr;
  block: Stmt[];
}

// TODO
export interface ForCStyleStatement extends Stmt {
  kind: "ForCStyleStatement";
  init?: Stmt;
  condition: Expr;
  update: Expr;
  block: Stmt[];
}

export interface StructStatement extends Stmt {
  kind: "StructStatement";
  name: Identifier;
  body: { id: Identifier; value: Expr; type: TypeInfo }[];
}

// x->y
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
  functions: Function[]; // cparse.ts, ...
  code: string;
}

export interface WhileStatement extends Stmt {
  kind: "WhileStatement";
  condition: Expr;
  block: Stmt[];
}

export interface UnaryExpr extends Expr {
  kind: "UnaryExpr";
  operator: string; // "-", "!", "&", "*"
  operand: Expr;
}

export interface DereferenceExpr extends Expr {
  kind: "DereferenceExpr";
  operand: Expr;
}

export interface AddressOfExpr extends Expr {
  kind: "AddressOfExpr";
  operand: Expr;
}

function inferUnaryType(
  operator: string,
  operand: Expr,
): TypeInfo {
  switch (operator) {
    case "-":
      return operand.type;
    case "!":
      return createTypeInfo("bool");
    default:
      return createTypeInfo("null");
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

export function AST_DEREFERENCE(operand: Expr, loc: Loc): DereferenceExpr {
  let resultType: TypeInfo = createTypeInfo("null");
  const typeInfo = operand.type as TypeInfo;

  if (typeInfo.isPointer && typeInfo.pointerLevel > 0) {
    if (typeInfo.pointerLevel === 1) {
      resultType = typeInfo;
    } else {
      resultType = {
        ...typeInfo,
        pointerLevel: typeInfo.pointerLevel - 1,
      };
    }
  }

  return {
    kind: "DereferenceExpr",
    operand: operand,
    type: resultType,
    value: null,
    loc,
  };
}

export function AST_ADDRESS_OF(operand: Expr, loc: Loc): AddressOfExpr {
  let resultType: TypeInfo = createTypeInfo("null");
  const typeInfo = operand.type as TypeInfo;

  resultType = {
    ...typeInfo,
    isPointer: true,
    pointerLevel: typeInfo.pointerLevel + 1,
  };

  return {
    kind: "AddressOfExpr",
    operand: operand,
    type: resultType,
    value: null,
    loc,
  };
}
