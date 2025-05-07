/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { Expr as _Expr } from "./parser/ast.ts";

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
  | "double"
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
  "double",
  "binary",
  "void",
];
