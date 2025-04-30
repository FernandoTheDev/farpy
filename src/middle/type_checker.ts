import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { Loc } from "../frontend/lexer/token.ts";
import { Expr, LLVMType } from "../frontend/parser/ast.ts";
import { TypesNative } from "../frontend/values.ts";

export class TypeChecker {
  private typeMap: Map<TypesNative | string, LLVMType>;

  constructor(private readonly reporter?: DiagnosticReporter) {
    this.typeMap = new Map();
    this.initializeTypeMap();
  }

  private initializeTypeMap(): void {
    this.typeMap.set("int", LLVMType.I32);
    this.typeMap.set("i32", LLVMType.I32);
    this.typeMap.set("float", LLVMType.DOUBLE);
    this.typeMap.set("double", LLVMType.DOUBLE);
    this.typeMap.set("string", LLVMType.STRING);
    this.typeMap.set("bool", LLVMType.I1);
    this.typeMap.set("binary", LLVMType.I32);
    this.typeMap.set("null", LLVMType.PTR);
    this.typeMap.set("id", LLVMType.PTR);
    this.typeMap.set("void", LLVMType.VOID);
  }

  public mapToLLVMType(
    sourceType: TypesNative | TypesNative[] | string,
  ): LLVMType {
    const llvmType = this.typeMap.get(sourceType as string);
    if (!llvmType) {
      return LLVMType.DOUBLE;
      // throw new Error(`Unsupported type mapping for ${sourceType}`);
    }
    return llvmType;
  }

  public getLLVMTypeString(type: LLVMType): string {
    switch (type) {
      case LLVMType.I1:
        return "i1";
      case LLVMType.I32:
        return "i32";
      case LLVMType.DOUBLE:
        return "double";
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
    return type === "int" || type === "float" || type === "binary" ||
      type === "double";
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

  public areTypesCompatible(
    sourceType: TypesNative | TypesNative[] | string,
    targetType: TypesNative | TypesNative[] | string,
  ): boolean {
    if (sourceType === targetType) return true;

    const source = String(sourceType);
    const target = String(targetType);

    const compatibilityMap: Record<string, string[]> = {
      "int": ["float", "double"],
      "float": ["double", "int", "i32"],
      "double": ["int", "float", "i32"],
      "binary": ["int"],
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
    switch (operator) {
      case "+":
        if (leftType === "string" || rightType === "string") {
          return "string";
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
            ? "float"
            : "int";
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
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
            ? "float"
            : "int";
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
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
            ? "float"
            : "int";
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
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
            ? "float"
            : "int";
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
        return Number.isInteger(Number(value)) ? `${value}.0` : `${value}`;
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
