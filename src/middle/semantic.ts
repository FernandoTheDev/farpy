import { CallExpr, ImportStatement, LLVMType } from "../frontend/parser/ast.ts";
import {
  BinaryExpr,
  DecrementExpr,
  Expr,
  Identifier,
  IncrementExpr,
  Program,
  Stmt,
  VariableDeclaration,
} from "../frontend/parser/ast.ts";
import { TypesNative } from "../frontend/values.ts";

interface SymbolInfo {
  id: string;
  sourceType: TypesNative | TypesNative[];
  llvmType: LLVMType;
  mutable: boolean;
  initialized: boolean;
  loc: any;
}

interface StdLibFunction {
  name: string;
  returnType: string;
  params: string[];
  isVariadic: boolean;
  llvmName: string;
  ir: string;
  isStdLib: boolean;
}

interface StdLibModule {
  name: string;
  functions: Map<string, StdLibFunction>;
}

export interface TypeMapping {
  sourceType: TypesNative | TypesNative[];
  llvmType: LLVMType;
}

const stdLibModules = new Map<string, StdLibModule>();

function initializeStdLibs() {
  const ioModule: StdLibModule = {
    name: "io",
    functions: new Map([
      ["print", {
        name: "print",
        returnType: "void",
        params: ["string"],
        isVariadic: false,
        llvmName: "print",
        ir: "declare void @print(i8*)",
        isStdLib: true,
      }],
      ["printf", {
        name: "printf",
        returnType: "i32",
        params: ["string"],
        isVariadic: true,
        llvmName: "printf",
        ir: "declare i32 @printf(i8*, ...)",
        isStdLib: true,
      }],
      ["scanf", {
        name: "scanf",
        returnType: "i32",
        params: ["string"],
        isVariadic: true,
        llvmName: "scanf",
        ir: "declare i32 @scanf(i8*, ...)",
        isStdLib: true,
      }],
    ]),
  };

  stdLibModules.set("io", ioModule);
}

export class Semantic {
  private static instance: Semantic;
  private scopeStack: Map<string, SymbolInfo>[] = [];
  private errors: string[] = [];
  private typeMap: Map<TypesNative | string, LLVMType> = new Map();
  public availableFunctions: Map<string, StdLibFunction> = new Map();
  public importedModules: Set<string> = new Set();

  private constructor() {
    this.pushScope();

    this.typeMap.set("int", LLVMType.I32);
    this.typeMap.set("i32", LLVMType.I32);
    this.typeMap.set("float", LLVMType.DOUBLE);
    this.typeMap.set("string", LLVMType.STRING);
    this.typeMap.set("bool", LLVMType.I1);
    this.typeMap.set("binary", LLVMType.I32);
    this.typeMap.set("null", LLVMType.PTR);
    this.typeMap.set("id", LLVMType.PTR);
    this.typeMap.set("void", LLVMType.VOID);

    initializeStdLibs();
  }

  public static getInstance(): Semantic {
    if (!Semantic.instance) {
      Semantic.instance = new Semantic();
    }
    return Semantic.instance;
  }

  private mapToLLVMType(sourceType: TypesNative | TypesNative[]): LLVMType {
    const llvmType = this.typeMap.get(sourceType as string);
    if (!llvmType) {
      throw new Error(`Unsupported type mapping for ${sourceType}`);
    }
    return llvmType;
  }

  public semantic(program: Program): Program {
    this.errors = [];
    this.scopeStack = [new Map()];

    const analyzedNodes: Stmt[] = [];

    for (const node of program.body || []) {
      try {
        const analyzedNode = this.analyzeNode(node);
        analyzedNodes.push(analyzedNode);
      } catch (error: any) {
        this.errors.push(`Semantic error: ${error.message}`);
      }
    }

    if (this.errors.length > 0) {
      console.error("Semantic analysis failed with errors:");
      this.errors.forEach((error) => console.error(error));
      throw new Error("Semantic analysis failed");
    }

    const analyzedProgram: Program = {
      ...program,
      body: analyzedNodes,
    };

    return analyzedProgram;
  }

  private analyzeNode(node: Stmt | Expr): Stmt | Expr {
    let analyzedNode: Stmt | Expr;

    switch (node.kind) {
      case "Program":
        analyzedNode = this.analyzeProgram(node as Program);
        break;
      case "ImportStatement":
        analyzedNode = this.analyzeImportStatement(node as ImportStatement);
        break;
      case "CallExpr":
        analyzedNode = this.analyzeCallExpr(node as CallExpr);
        break;
      case "BinaryExpr":
        analyzedNode = this.analyzeBinaryExpr(node as BinaryExpr);
        break;
      case "Identifier":
        analyzedNode = this.analyzeIdentifier(node as Identifier);
        break;
      case "VariableDeclaration":
        analyzedNode = this.analyzeVariableDeclaration(
          node as VariableDeclaration,
        );
        break;
      case "IncrementExpr":
        analyzedNode = this.analyzeIncrementExpr(node as IncrementExpr);
        break;
      case "DecrementExpr":
        analyzedNode = this.analyzeDecrementExpr(node as DecrementExpr);
        break;
      case "StringLiteral":
      case "IntLiteral":
      case "FloatLiteral":
      case "BinaryLiteral":
      case "NullLiteral":
        analyzedNode = {
          ...node,
          llvmType: this.mapToLLVMType(node.type),
        };
        break;
      default:
        throw new Error(`Unknown node kind: ${node.kind}`);
    }

    if (!analyzedNode.llvmType) {
      (analyzedNode as any).llvmType = this
        .mapToLLVMType(analyzedNode.type);
    }

    return analyzedNode;
  }

  private analyzeProgram(program: Program): Program {
    const analyzedBody: Stmt[] = [];

    for (const node of program.body || []) {
      const analyzedNode = this.analyzeNode(node);
      analyzedBody.push(analyzedNode);
    }

    return {
      ...program,
      body: analyzedBody,
      llvmType: LLVMType.VOID,
    };
  }

  private analyzeImportStatement(node: ImportStatement): ImportStatement {
    if (!node.isStdLib) {
      return node;
    }

    const moduleName = node.path.value;

    if (!stdLibModules.has(moduleName)) {
      throw new Error(`Standard library module '${moduleName}' not found`);
    }

    this.importedModules.add(moduleName);

    const module = stdLibModules.get(moduleName)!;
    for (const [funcName, funcInfo] of module.functions) {
      this.availableFunctions.set(funcName, {
        name: funcName,
        returnType: funcInfo.returnType,
        params: funcInfo.params,
        isVariadic: funcInfo.isVariadic,
        llvmName: funcInfo.llvmName,
        ir: funcInfo.ir,
        isStdLib: funcInfo.isStdLib,
      });
    }

    return node;
  }

  private analyzeCallExpr(node: CallExpr): CallExpr {
    const funcName = node.callee.value;

    if (!this.availableFunctions.has(funcName)) {
      throw new Error(`Function '${funcName}' is not defined`);
    }

    const funcInfo = this.availableFunctions.get(funcName)!;

    if (
      !funcInfo.isVariadic && node.arguments.length !== funcInfo.params.length
    ) {
      throw new Error(
        `Function '${funcName}' expects ${funcInfo.params.length} arguments, but got ${node.arguments.length}`,
      );
    }

    node.type = funcInfo.returnType as TypesNative;

    for (
      let i = 0;
      i < Math.min(node.arguments.length, funcInfo.params.length);
      i++
    ) {
      const argType = node.arguments[i].type;
      const paramType = funcInfo.params[i] as TypesNative;

      if (argType != "string" && paramType == "string") {
        node.arguments[i].type = "string";
        node.arguments[i].value = String(node.arguments[i].value);
        continue;
      }

      if (!this.areTypesCompatible(argType, paramType)) {
        throw new Error(
          `Argument ${
            i + 1
          } of function '${funcName}' expects type '${paramType}', but got '${argType}'`,
        );
      }
    }

    return node;
  }

  private analyzeBinaryExpr(expr: BinaryExpr): BinaryExpr {
    const left = this.analyzeNode(expr.left) as Expr;
    const right = this.analyzeNode(expr.right) as Expr;

    const resultType = this.checkTypesCompatibility(
      left.type,
      right.type,
      expr.operator,
    );
    const llvmResultType = this.mapToLLVMType(resultType);

    return {
      ...expr,
      left,
      right,
      type: resultType,
      llvmType: llvmResultType,
    };
  }

  private analyzeIdentifier(id: Identifier): Identifier {
    const symbol = this.lookupSymbol(id.value);
    if (!symbol) {
      throw new Error(
        `Variable '${id.value}' is not defined at ${id.loc.line}:${id.loc.start}`,
      );
    }

    return {
      ...id,
      type: symbol.sourceType,
      llvmType: symbol.llvmType,
    };
  }

  private analyzeVariableDeclaration(
    decl: VariableDeclaration,
  ): VariableDeclaration {
    const analyzedValue = this.analyzeNode(decl.value) as Expr;

    if (this.currentScope().has(decl.id.value)) {
      throw new Error(
        `Variable '${decl.id.value}' is already defined in this scope at ${decl.loc.line}:${decl.loc.start}`,
      );
    }

    if (analyzedValue.type !== decl.type) {
      if (!this.areTypesCompatible(analyzedValue.type, decl.type)) {
        throw new Error(
          `Type mismatch: Cannot assign value of type '${analyzedValue.type}' to variable of type '${decl.type}' at ${decl.loc.line}:${decl.loc.start}`,
        );
      }
    }

    const actualType = analyzedValue.type ?? decl.type;
    const llvmType = this.mapToLLVMType(actualType);

    this.defineSymbol({
      id: decl.id.value,
      sourceType: actualType,
      llvmType: llvmType,
      mutable: decl.mutable,
      initialized: true,
      loc: decl.loc,
    });

    return {
      ...decl,
      value: analyzedValue,
      type: actualType,
      llvmType: llvmType,
    };
  }

  private analyzeIncrementExpr(expr: IncrementExpr): IncrementExpr {
    const analyzedValue = this.analyzeNode(expr.value) as Expr;

    if (analyzedValue.kind !== "Identifier") {
      throw new Error(
        `Cannot increment non-variable expression at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    if (analyzedValue.type !== "int" && analyzedValue.type !== "float") {
      throw new Error(
        `Cannot increment variable of type '${analyzedValue.type}' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    const symbol = this.lookupSymbol((analyzedValue as Identifier).value);
    if (symbol && !symbol.mutable) {
      throw new Error(
        `Cannot increment immutable variable '${
          (analyzedValue as Identifier).value
        }' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    return {
      ...expr,
      value: analyzedValue,
      type: analyzedValue.type,
      llvmType: (analyzedValue as any).llvmType,
    };
  }

  private analyzeDecrementExpr(expr: DecrementExpr): DecrementExpr {
    const analyzedValue = this.analyzeNode(expr.value) as Expr;

    if (analyzedValue.kind !== "Identifier") {
      throw new Error(
        `Cannot decrement non-variable expression at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    if (analyzedValue.type !== "int" && analyzedValue.type !== "float") {
      throw new Error(
        `Cannot decrement variable of type '${analyzedValue.type}' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    const symbol = this.lookupSymbol((analyzedValue as Identifier).value);
    if (symbol && !symbol.mutable) {
      throw new Error(
        `Cannot decrement immutable variable '${
          (analyzedValue as Identifier).value
        }' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    return {
      ...expr,
      value: analyzedValue,
      type: analyzedValue.type,
      llvmType: (analyzedValue as any).llvmType,
    };
  }

  private pushScope(): void {
    this.scopeStack.push(new Map());
  }

  private popScope(): void {
    if (this.scopeStack.length <= 1) {
      throw new Error("Cannot pop the global scope");
    }
    this.scopeStack.pop();
  }

  private currentScope(): Map<string, SymbolInfo> {
    return this.scopeStack[this.scopeStack.length - 1];
  }

  private defineSymbol(info: SymbolInfo): void {
    this.currentScope().set(info.id, info);
  }

  private lookupSymbol(id: string): SymbolInfo | undefined {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      const symbol = scope.get(id);
      if (symbol) {
        return symbol;
      }
    }
    return undefined;
  }

  private checkTypesCompatibility(
    leftType: TypesNative | TypesNative[],
    rightType: TypesNative | TypesNative[],
    operator: string,
  ): TypesNative | TypesNative[] {
    switch (operator) {
      case "+":
        if (leftType === "string" || rightType === "string") {
          return "string";
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return leftType === "float" || rightType === "float"
            ? "float"
            : "int";
        }
        throw new Error(
          `Operator '+' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "-":
      case "*":
      case "/":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return leftType === "float" || rightType === "float"
            ? "float"
            : "int";
        }
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "%":
        if (leftType === "int" && rightType === "int") {
          return "int";
        }
        throw new Error(
          `Operator '%' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "==":
      case "!=":
        if (this.areTypesCompatible(leftType, rightType)) {
          return "bool";
        }
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
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      case "&&":
      case "||":
        if (leftType === "bool" && rightType === "bool") {
          return "bool";
        }
        throw new Error(
          `Operator '${operator}' cannot be applied to types '${leftType}' and '${rightType}'`,
        );

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private isNumericType(type: TypesNative | TypesNative[]): boolean {
    return type === "int" || type === "float" || type === "binary";
  }

  private areTypesCompatible(
    sourceType: TypesNative | TypesNative[],
    targetType: TypesNative | TypesNative[],
  ): boolean {
    if (sourceType === targetType) return true;
    if (
      sourceType === "int" && targetType === "float" ||
      sourceType === "float" && targetType === "int"
    ) return true;
    if (sourceType === "binary" && targetType === "int") return true;
    return false;
  }
}
