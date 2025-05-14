/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { Loc } from "../frontend/lexer/token.ts";
import { Expr, LLVMType } from "../frontend/parser/ast.ts";
import { TypesNative } from "../frontend/values.ts";

export class TypeChecker {
  private typeMap: Map<TypesNative | string, LLVMType>;
  // Define type promotion hierarchy
  private typeHierarchy: Record<string, number> = {
    "i1": 1,
    "bool": 1,
    "int": 2,
    "i32": 2,
    "binary": 2,
    "i64": 3,
    "i128": 3,
    "long": 3,
    "float": 4,
    "double": 5,
  };

  constructor(private readonly reporter?: DiagnosticReporter) {
    this.typeMap = new Map();
    this.initializeTypeMap();
  }

  private initializeTypeMap(): void {
    this.typeMap.set("int", LLVMType.I32);
    this.typeMap.set("i32", LLVMType.I32);
    this.typeMap.set("i64", LLVMType.I64);
    this.typeMap.set("long", LLVMType.I128);
    this.typeMap.set("float", LLVMType.DOUBLE);
    this.typeMap.set("double", LLVMType.DOUBLE);
    this.typeMap.set("string", LLVMType.STRING);
    this.typeMap.set("bool", LLVMType.I1);
    this.typeMap.set("binary", LLVMType.I32);
    this.typeMap.set("null", LLVMType.PTR);
    this.typeMap.set("id", LLVMType.PTR);
    this.typeMap.set("void", LLVMType.VOID);
    this.typeMap.set("i8*", LLVMType.STRING);
    // C | const char *
    this.typeMap.set("const char *", LLVMType.STRING);
    this.typeMap.set("char *", LLVMType.STRING);
  }

  public isValidType(type: string | LLVMType | TypesNative): boolean {
    return this.typeMap.get(String(type)) != undefined;
  }

  public mapToLLVMType(
    sourceType: TypesNative | TypesNative[] | string,
  ): LLVMType {
    const llvmType = this.typeMap.get(sourceType as string);
    if (!llvmType) {
      // return LLVMType.DOUBLE;
      throw new Error(`Unsupported type mapping for ${sourceType}`);
    }
    return llvmType;
  }

  public getLLVMTypeString(type: LLVMType): string {
    switch (type) {
      case LLVMType.I1:
        return "i1";
      case LLVMType.I32:
        return "i32";
      case LLVMType.I64:
        return "i64";
      case LLVMType.DOUBLE:
        return "double";
      case LLVMType.I128:
        return "long";
      case LLVMType.STRING:
        return "i8*";
      case LLVMType.VOID:
        return "void";
      case LLVMType.PTR:
        return "ptr";
      default:
        return "i8*";
    }
  }

  public isNumericType(type: TypesNative | TypesNative[] | string): boolean {
    const numericTypes = [
      "int",
      "i32",
      "i64",
      "long",
      "float",
      "double",
      "binary",
    ];
    return numericTypes.includes(String(type));
  }

  public isFloat(
    left: TypesNative | string,
    right: TypesNative | string,
  ): boolean {
    return (
      left === "float" || right === "float" || left === "double" ||
      right === "double"
    );
  }

  // Gets the promoted type between two numeric types
  private promoteTypes(
    leftType: TypesNative | string,
    rightType: TypesNative | string,
  ): TypesNative {
    const leftRank = this.typeHierarchy[String(leftType)] || 0;
    const rightRank = this.typeHierarchy[String(rightType)] || 0;

    if (leftRank >= rightRank) {
      return leftType as TypesNative;
    }
    return rightType as TypesNative;
  }

  public areTypesCompatible(
    sourceType: TypesNative | TypesNative[] | string,
    targetType: TypesNative | TypesNative[] | string,
  ): boolean {
    if (sourceType === targetType) return true;

    const source = String(sourceType);
    const target = String(targetType);

    // Check if both are numeric types
    if (this.isNumericType(source) && this.isNumericType(target)) {
      return true;
    }

    const compatibilityMap: Record<string, string[]> = {
      "int": ["float", "double", "i64", "long"],
      "i32": ["float", "double", "i64", "long"],
      "float": ["double", "int", "i32", "i64", "long"],
      "double": ["int", "i32", "float", "i64", "long"],
      "binary": ["int", "i32", "i64", "long"],
      "i64": ["float", "double"],
      "long": ["float", "double"],
      "string": ["const char *", "char *"],
      // "bool": ["int", "i32", "long", "float", "double", "string", "i64"],
    };

    if (compatibilityMap[source]?.includes(target)) return true;
    if (source === "id" || target === "id") return true;

    return false;
  }

  public checkBinaryExprTypes(
    left: Expr,
    right: Expr,
    operator: string,
  ): TypesNative | TypesNative[] {
    const leftType: TypesNative | TypesNative[] | string = left.type;
    const rightType: TypesNative | TypesNative[] | string = right.type;

    // Check compatibility between types
    if (
      leftType !== rightType && !this.areTypesCompatible(leftType, rightType)
    ) {
      this.reporter!.addError(
        this.makeLoc(left.loc, right.loc),
        `Operator '${operator}' cannot be applied to incompatible types '${leftType}' and '${rightType}'`,
      );
      throw new Error(
        `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
      );
    }

    switch (operator) {
      case "+":
        if (leftType === "string" || rightType === "string") {
          return "string";
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          // Return the promoted type based on hierarchy
          return this.promoteTypes(
            leftType as TypesNative,
            rightType as TypesNative,
          );
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '+' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "-":
      case "*":
      case "/":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          // Return the promoted type based on hierarchy
          return this.promoteTypes(
            leftType as TypesNative,
            rightType as TypesNative,
          );
        }
        if (right.value == 0 && operator === "/") {
          this.reporter!.addError(
            this.makeLoc(left.loc, right.loc),
            "Division by zero detected during type checking",
          );
          throw new Error("Division by zero detected during type checking");
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
      case "%":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          // Return the promoted type based on hierarchy
          return this.promoteTypes(
            leftType as TypesNative,
            rightType as TypesNative,
          );
        }
        if (right.value == 0) {
          this.reporter!.addError(
            this.makeLoc(left.loc, right.loc),
            "Division by zero detected during type checking",
          );
          throw new Error("Division by zero detected during type checking");
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '%' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
      case "**":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          // Return the promoted type based on hierarchy
          return this.promoteTypes(
            leftType as TypesNative,
            rightType as TypesNative,
          );
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '**' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
      case "==":
      case "!=":
        if (this.areTypesCompatible(leftType, rightType)) {
          return "bool";
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '${operator}' cannot be applied to incompatible types '${leftType}' and '${rightType}'`,
        );

      case "<":
      case "<=":
      case ">":
      case ">=":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return "bool";
        }
        if (leftType === "string" && rightType === "string") {
          return "bool";
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "&&":
      case "||":
        if (leftType === "bool" && rightType === "bool") {
          return "bool";
        }
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      default:
        this.reporter!.addError(
          this.makeLoc(left.loc, right.loc),
          `Unknown operator: ${operator}`,
        );
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  public registerCustomType(sourceType: string, llvmType: LLVMType): void {
    this.typeMap.set(sourceType, llvmType);
  }

  // Helper
  private makeLoc(start: Loc, end: Loc): Loc {
    return { ...start, end: end.end, line_string: start.line_string };
  }

  public formatLiteralForType(
    value: any,
    targetType: string,
  ): string | number {
    if (!Number.isNaN(value)) {
      if (targetType === "float" || targetType === "double") {
        return Number.isInteger(Number(value)) && !String(value).includes(".")
          ? `${value}.0`
          : `${value}`;
      }
      return `${Math.floor(value)}`;
    }

    if (typeof value === "string") {
      return value;
    }

    return `${value}`;
  }
}

// Create a singleton instance for global access
let typeCheckerInstance: TypeChecker | null = null;

export function getTypeChecker(reporter?: DiagnosticReporter): TypeChecker {
  if (!typeCheckerInstance) {
    typeCheckerInstance = new TypeChecker(reporter);
  }
  return typeCheckerInstance;
}
