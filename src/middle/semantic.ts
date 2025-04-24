import {
  CallExpr,
  FunctionArgs,
  FunctionDeclaration,
  ImportStatement,
  LLVMType,
  ReturnStatement,
} from "../frontend/parser/ast.ts";
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

export interface StdLibFunction {
  name: string;
  returnType: string;
  params: string[];
  isVariadic: boolean;
  llvmName?: string;
  ir?: string;
  isStdLib?: boolean;
  llvmType: LLVMType;
}

export interface Function {
  name: string;
  returnType: TypesNative | TypesNative[];
  params: { name: string; type: string; llvmType: string }[];
  isVariadic: boolean;
  llvmType: LLVMType;
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
    // @ts-ignore
    functions: new Map([
      ["print", {
        name: "print",
        returnType: "void",
        llvmType: "void",
        params: ["string"],
        isVariadic: false,
        llvmName: "print",
        ir: "declare void @print(i8*)",
        isStdLib: true,
      }],
      ["printf", {
        name: "printf",
        returnType: "int",
        llvmType: "i32",
        params: ["string"],
        isVariadic: true,
        llvmName: "printf",
        ir: "declare i32 @printf(i8*, ...)",
        isStdLib: true,
      }],
      ["scanf", {
        name: "scanf",
        returnType: "int",
        llvmType: "i32",
        params: ["string"],
        isVariadic: true,
        llvmName: "scanf",
        ir: "declare i32 @scanf(i8*, ...)",
        isStdLib: true,
      }],
    ]),
  };

  const mathModule: StdLibModule = {
    name: "math",
    // @ts-ignore
    functions: new Map([
      ["sin", {
        name: "sin",
        returnType: "double",
        llvmType: "double",
        params: ["double"],
        isVariadic: false,
        llvmName: "sin",
        ir: "declare double @sin(double)",
        isStdLib: true,
      }],

      ["cos", {
        name: "cos",
        returnType: "double",
        llvmType: "double",
        params: ["double"],
        isVariadic: false,
        llvmName: "cos",
        ir: "declare double @cos(double)",
        isStdLib: true,
      }],

      ["log", {
        name: "log",
        returnType: "double",
        llvmType: "double",
        params: ["double"],
        isVariadic: false,
        llvmName: "log",
        ir: "declare double @log(double)",
        isStdLib: true,
      }],

      ["exp", {
        name: "exp",
        returnType: "double",
        llvmType: "double",
        params: ["double"],
        isVariadic: false,
        llvmName: "exp",
        ir: "declare double @exp(double)",
        isStdLib: true,
      }],

      ["sqrt", {
        name: "sqrt",
        returnType: "double",
        llvmType: "double",
        params: ["double"],
        isVariadic: false,
        llvmName: "sqrt",
        ir: "declare double @sqrt(double)",
        isStdLib: true,
      }],

      ["pi", {
        name: "pi",
        returnType: "double",
        llvmType: "double",
        params: [],
        isVariadic: false,
        llvmName: "pi",
        ir: "define double @pi() { ret double 3.141592653589793 }",
        isStdLib: true,
      }],

      ["e", {
        name: "e",
        returnType: "double",
        llvmType: "double",
        params: [],
        isVariadic: false,
        llvmName: "e",
        ir: "define double @e() { ret double 2.718281828459045 }",
        isStdLib: true,
      }],
    ]),
  };

  stdLibModules.set("io", ioModule);
  stdLibModules.set("math", mathModule);
}

export class Semantic {
  private static instance: Semantic;
  private scopeStack: Map<string, SymbolInfo>[] = [];
  private errors: string[] = [];
  private typeMap: Map<TypesNative | string, LLVMType> = new Map();
  public availableFunctions: Map<string, StdLibFunction | Function> = new Map();
  public importedModules: Set<string> = new Set();
  public identifiersUsed: Set<string> = new Set();

  private constructor() {
    this.pushScope();

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
      case "ReturnStatement":
        analyzedNode = this.analyzeReturnStatement(node as ReturnStatement);
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
      case "FunctionDeclaration":
        analyzedNode = this.analyzeFnDeclaration(node as FunctionDeclaration);
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

  private analyzeFnDeclaration(node: FunctionDeclaration): FunctionDeclaration {
    const funcName = node.id.value;

    if (this.availableFunctions.has(funcName)) {
      throw new Error(`Function '${funcName}' is already defined.`);
    }

    this.pushScope();

    const analyzedArgs: FunctionArgs[] = [];
    for (const arg of node.args) {
      if (this.currentScope().has(arg.id.value)) {
        throw new Error(
          `Parameter '${arg.id.value}' is already defined in function '${funcName}' at ${arg.id.loc.line}:${arg.id.loc.start}`,
        );
      }

      const llvmType = this.mapToLLVMType(arg.type);
      arg.llvmType = llvmType;

      this.defineSymbol({
        id: arg.id.value,
        sourceType: arg.type,
        llvmType: llvmType,
        mutable: true,
        initialized: true,
        loc: arg.id.loc,
      });

      analyzedArgs.push({
        ...arg,
      });
    }

    const returnType = node.type || "void";
    const returnLLVMType = this.mapToLLVMType(returnType);

    const funcInfo = {
      name: funcName,
      params: node.args.map((arg) => ({
        name: arg.id.value,
        type: arg.type,
        llvmType: this.mapToLLVMType(arg.type),
      })),
      returnType: returnType,
      llvmType: returnLLVMType,
      isVariadic: false,
      loc: node.loc,
    };
    this.availableFunctions.set(funcName, funcInfo as Function);

    const analyzedBlock: Stmt[] = [];
    let hasReturn = false;

    for (const stmt of node.block) {
      const analyzedStmt = this.analyzeNode(stmt) as Stmt;
      analyzedBlock.push(analyzedStmt);

      if (analyzedStmt.kind === "ReturnStatement") {
        hasReturn = true;

        const returnExpr = (analyzedStmt as any).value;
        if (returnExpr) {
          const returnExprType = returnExpr.type;

          if (
            !this.areTypesCompatible(returnExprType, returnType) &&
            returnType !== "void"
          ) {
            throw new Error(
              `Function '${funcName}' returns '${returnExprType}' but is declared to return '${returnType}'`,
            );
          }
        }
      }
    }

    if (returnType !== "void" && !hasReturn) {
      throw new Error(
        `Function '${funcName}' is declared to return '${returnType}' but has no return statement`,
      );
    }

    this.popScope();

    return {
      ...node,
      args: analyzedArgs,
      block: analyzedBlock,
      type: returnType,
      llvmType: returnLLVMType,
    };
  }

  private analyzeReturnStatement(node: ReturnStatement): ReturnStatement {
    node.expr = this.analyzeNode(node.expr);
    node.llvmType = node.expr.llvmType;
    return node;
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
        llvmType: funcInfo.llvmType,
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

    if (
      !this.identifiersUsed.has(funcInfo.name)
    ) {
      this.identifiersUsed.add(funcInfo.name);
    }

    for (
      let i = 0;
      i < node.arguments.length;
      i++
    ) {
      if (
        node.arguments[i].kind === "Identifier" &&
        !this.identifiersUsed.has(node.arguments[i].value)
      ) {
        this.identifiersUsed.add(node.arguments[i].value);
      }

      const argType = node.arguments[i].type;
      const paramType = funcInfo.params[i] as TypesNative;

      if (paramType == undefined && funcInfo.isVariadic) {
        continue;
      }

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

    if (!this.identifiersUsed.has(id.value)) {
      this.identifiersUsed.add(id.value);
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
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
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
          return this.isFloat(leftType as TypesNative, rightType as TypesNative)
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

  private isFloat(left: TypesNative, right: TypesNative): boolean {
    return (
      left === "float" || right === "float" || left === "double" ||
      right === "double"
    );
  }

  private isNumericType(type: TypesNative | TypesNative[]): boolean {
    return type === "int" || type === "float" || type === "binary" ||
      type === "double";
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
    if (sourceType === "id" || targetType === "id") return true;
    return false;
  }
}
