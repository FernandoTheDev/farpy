import { Loc } from "../frontend/lexer/token.ts";
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
import { StandardLibrary } from "./standard_library.ts";
import { Function, StdLibFunction } from "./std_lib_module_builder.ts";
import { getTypeChecker, TypeChecker } from "./type_checker.ts";

export interface TypeMapping {
  sourceType: TypesNative | TypesNative[];
  llvmType: LLVMType;
}

interface SymbolInfo {
  id: string;
  sourceType: TypesNative | TypesNative[];
  llvmType: LLVMType;
  mutable: boolean;
  initialized: boolean;
  loc: Loc;
}

export class Semantic {
  private static instance: Semantic;
  private scopeStack: Map<string, SymbolInfo>[] = [];
  private errors: string[] = [];
  private typeChecker: TypeChecker;
  public availableFunctions: Map<string, StdLibFunction | Function> = new Map();
  public importedModules: Set<string> = new Set();
  public identifiersUsed: Set<string> = new Set();

  private constructor() {
    this.pushScope();
    this.typeChecker = getTypeChecker();
    StandardLibrary.getInstance(); // Initialize standard library
  }

  public static getInstance(): Semantic {
    if (!Semantic.instance) {
      Semantic.instance = new Semantic();
    }
    return Semantic.instance;
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
          llvmType: this.typeChecker.mapToLLVMType(node.type),
        };
        break;
      default:
        throw new Error(`Unknown node kind: ${node.kind}`);
    }

    if (!analyzedNode.llvmType) {
      (analyzedNode as any).llvmType = this.typeChecker.mapToLLVMType(
        analyzedNode.type,
      );
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

      const llvmType = this.typeChecker.mapToLLVMType(arg.type);
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
    const returnLLVMType = this.typeChecker.mapToLLVMType(returnType);

    const funcInfo = {
      name: funcName,
      params: node.args.map((arg) => ({
        name: arg.id.value,
        type: arg.type,
        llvmType: this.typeChecker.mapToLLVMType(arg.type),
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
            !this.typeChecker.areTypesCompatible(returnExprType, returnType) &&
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
    const stdLib = StandardLibrary.getInstance();

    if (!stdLib.hasModule(moduleName)) {
      throw new Error(`Standard library module '${moduleName}' not found`);
    }

    this.importedModules.add(moduleName);

    const module = stdLib.getModule(moduleName)!;
    for (const [funcName, funcInfo] of module.functions) {
      this.availableFunctions.set(funcName, funcInfo);
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

      if (!this.typeChecker.areTypesCompatible(argType, paramType)) {
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

    if (
      left.kind === "Identifier" &&
      !this.identifiersUsed.has(left.value)
    ) {
      this.identifiersUsed.add(left.value);
    }

    if (
      right.kind === "Identifier" &&
      !this.identifiersUsed.has(right.value)
    ) {
      this.identifiersUsed.add(right.value);
    }

    const resultType = this.typeChecker.checkBinaryExprTypes(
      left.type,
      right.type,
      expr.operator,
    );
    const llvmResultType = this.typeChecker.mapToLLVMType(resultType);

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
    const llvmType = this.typeChecker.mapToLLVMType(actualType);

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
}
