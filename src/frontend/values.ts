import { Expr as _Expr } from "./parser/ast.ts";
import { Loc, NativeValue } from "./lexer/token.ts";

// export interface GenericType {
//   base: string; // ex: "lambda", "list", etc.
//   typeParams: TypesNative[];
// }

export interface IParsedTypes {
  types: TypesNative[];
}

export type TypesNative =
  | "string"
  | "id"
  | "int"
  | "bool"
  | "null"
  | "float"
  | "binary"
  | "void";
// GenericType;

export const TypesNativeArray: string[] = [
  "string",
  "id",
  "int",
  "bool",
  "null",
  "float",
  "binary",
  "void",
];

export interface RuntimeValue {
  kind?: string;
  type?: TypesNative | TypesNative[];
  value: NativeValue;
  break: boolean; // to FlowControl
  loc: Loc;
}

export interface NullValue extends RuntimeValue {
  type: "null";
  value: null;
}

export function VALUE_NULL(n: null = null, loc: Loc): NullValue {
  return { type: "null", value: n, loc: loc, break: false };
}

export interface IntValue extends RuntimeValue {
  type: "int";
  value: number;
}

export function VALUE_INT(n: number = 0, loc: Loc): IntValue {
  return { type: "int", value: n, loc: loc, break: false };
}

export interface FloatValue extends RuntimeValue {
  type: "float";
  value: number;
}

export function VALUE_FLOAT(n: number = 0, loc: Loc): FloatValue {
  return { type: "float", value: n, loc: loc, break: false };
}

export interface StringValue extends RuntimeValue {
  type: "string";
  value: string;
}

export function VALUE_STRING(n: string = "error", loc: Loc): StringValue {
  return { type: "string", value: n, loc: loc, break: false };
}

export interface BooleanValue extends RuntimeValue {
  type: "bool";
  value: boolean;
}

export function VALUE_BOOL(n: boolean = false, loc: Loc): BooleanValue {
  return { type: "bool", value: n, loc: loc, break: false };
}

export interface VoidValue extends RuntimeValue {
  type: "void";
  value: "void";
}

export function VALUE_VOID(loc: Loc): VoidValue {
  return { type: "void", value: "void", loc: loc, break: false };
}
