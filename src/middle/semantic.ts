import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { Lexer } from "../frontend/lexer/lexer.ts";
import { Loc, Token } from "../frontend/lexer/token.ts";
import {
  AssignmentDeclaration,
  CallExpr,
  ElifStatement,
  ElseStatement,
  FunctionArgs,
  FunctionDeclaration,
  IfStatement,
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
import { Parser } from "../frontend/parser/parser.ts";
import { TypesNative } from "../frontend/values.ts";
import { StandardLibrary } from "./standard_library.ts";
import {
  Function,
  StdLibFunction,
  StdLibModule,
} from "./std_lib_module_builder.ts";
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
  protected scopeStack: Map<string, SymbolInfo>[] = [];
  private typeChecker: TypeChecker;
  public availableFunctions: Map<string, StdLibFunction | Function> = new Map();
  public importedModules: Set<string> = new Set();
  public stdLibs: Map<string, StdLibModule> = new Map();
  public identifiersUsed: Set<string> = new Set();
  private externalNodes: Stmt[] = [];

  private constructor(private readonly reporter: DiagnosticReporter) {
    this.pushScope();
    this.typeChecker = getTypeChecker(reporter);
    StandardLibrary.getInstance(reporter); // Initialize standard library
  }

  public static getInstance(reporter: DiagnosticReporter): Semantic {
    if (!Semantic.instance) {
      Semantic.instance = new Semantic(reporter);
    }
    return Semantic.instance;
  }

  public semantic(program: Program): Program {
    this.scopeStack = [new Map()];

    const analyzedNodes: Stmt[] = [];

    for (const node of program.body || []) {
      try {
        analyzedNodes.push(this.analyzeNode(node));
      } catch (_error: any) {
        // Ignore
        console.log("Error in semantic analysis:", _error.message);
      }
    }

    const analyzedProgram: Program = {
      ...program,
      body: [...this.externalNodes, ...analyzedNodes],
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
      case "IfStatement":
      case "ElifStatement":
        analyzedNode = this.analyzeIfStatement(
          node.kind == "ElifStatement"
            ? node as ElifStatement
            : node as IfStatement,
        );
        break;
      case "ElseStatement":
        analyzedNode = this.analyzeElseStatement(node as ElseStatement);
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
      case "AssignmentDeclaration":
        analyzedNode = this.analyzeAssignmentDeclaration(
          node as AssignmentDeclaration,
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
      default: {
        this.reporter.addError(node.loc, `Unknown node kind: ${node.kind}`);
        throw new Error(`Unknown node kind: ${node.kind}`);
      }
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

  private analyzeElseStatement(
    node: ElseStatement,
  ): ElseStatement {
    for (let i = 0; i < node.primary.length; i++) {
      node.primary[i] = this.analyzeNode(node.primary[i]);
    }

    return node;
  }

  private analyzeIfStatement(
    node: IfStatement | ElifStatement,
  ): IfStatement | ElifStatement {
    node.condition = this.analyzeNode(node.condition as Expr);

    for (let i = 0; i < node.primary.length; i++) {
      node.primary[i] = this.analyzeNode(node.primary[i]);
    }

    if (node.secondary !== null) {
      // @ts-ignore
      node.secondary = this.analyzeNode(node.secondary as Stmt);
    }

    return node;
  }

  private analyzeAssignmentDeclaration(
    node: AssignmentDeclaration,
  ): AssignmentDeclaration {
    const analyzedValue = this.analyzeNode(node.value) as Expr;

    if (node.id.kind !== "Identifier") {
      this.reporter.addError(
        node.id.loc,
        `Cannot assign to non-variable expression`,
      );
      throw new Error(
        `Cannot assign to non-variable expression at ${node.id.loc.line}:${node.id.loc.start}`,
      );
    }

    const symbol = this.lookupSymbol(node.id.value);
    if (!symbol) {
      this.reporter.addError(
        node.id.loc,
        `Variable '${node.id.value}' is not defined`,
      );
      throw new Error(
        `Variable '${node.id.value}' is not defined at ${node.id.loc.line}:${node.id.loc.start}`,
      );
    }

    if (!symbol.mutable) {
      this.reporter.addError(
        node.id.loc,
        `Cannot assign to immutable variable '${node.id.value}'`,
      );
      throw new Error(
        `Cannot assign to immutable variable '${node.id.value}' at ${node.id.loc.line}:${node.id.loc.start}`,
      );
    }

    this.identifiersUsed.add(node.id.value);

    return {
      ...node,
      value: analyzedValue,
    };
  }

  private analyzeFnDeclaration(node: FunctionDeclaration): FunctionDeclaration {
    const funcName = node.id.value;

    if (this.availableFunctions.has(funcName)) {
      this.reporter.addError(
        node.loc,
        `Function '${funcName}' is already defined`,
      );
      throw new Error(`Function '${funcName}' is already defined.`);
    }

    this.pushScope();

    const analyzedArgs: FunctionArgs[] = [];
    for (const arg of node.args) {
      if (this.currentScope().has(arg.id.value)) {
        this.reporter.addError(
          arg.id.loc,
          `Parameter '${arg.id.value}' is already defined in function '${funcName}'`,
        );
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
        llvmType: llvmType,
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
            this.reporter.addError(
              node.loc,
              `Function '${funcName}' returns '${returnExprType}' but is declared to return '${returnType}'`,
            );
            throw new Error(
              `Function '${funcName}' returns '${returnExprType}' but is declared to return '${returnType}'`,
            );
          }
        }
      }
    }

    if (returnType !== "void" && !hasReturn) {
      this.reporter.addError(
        node.loc,
        `Function '${funcName}' is declared to return '${returnType}' but has no return statement`,
      );
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
      return this.analyzeImportExternal(node);
    }

    const moduleName = node.path.value;
    const stdLib = StandardLibrary.getInstance();

    if (!stdLib.hasModule(moduleName)) {
      this.reporter.addError(
        node.path.loc,
        `Standard library module '${moduleName}' not found`,
      );
      throw new Error(`Standard library module '${moduleName}' not found`);
    }

    if (this.importedModules.has(moduleName)) {
      this.reporter.addError(
        node.path.loc,
        `Module '${moduleName}' is already imported`,
        [
          this.reporter.makeSuggestion(
            "Remove the import in the file you are importing, not the one being imported.",
          ),
        ],
      );
      throw new Error(`Module '${moduleName}' is already imported`);
    }

    this.importedModules.add(moduleName);
    const module = stdLib.getModule(moduleName)!;
    this.stdLibs.set(moduleName, module);

    for (const [funcName, funcInfo] of module.functions) {
      this.availableFunctions.set(funcName, funcInfo);
    }

    return node;
  }

  private analyzeImportExternal(node: ImportStatement): ImportStatement {
    const moduleName = node.path.value;

    if (this.importedModules.has(moduleName)) {
      this.reporter.addError(
        node.path.loc,
        `Module '${moduleName}' is already imported`,
      );
      throw new Error(`Module '${moduleName}' is already imported`);
    }

    this.importedModules.add(moduleName);

    // TODO: Use the file's directory and not the user's as it is now
    const filePath = node.loc.dir + moduleName;
    const file = Deno.readTextFileSync(filePath);

    if (!file) {
      this.reporter.addError(
        node.path.loc,
        `Module '${moduleName}' not found`,
      );
      throw new Error(`Module '${moduleName}' not found`);
    }

    const tokens: Token[] | null = new Lexer(
      moduleName,
      file,
      node.loc.dir,
      this.reporter,
    )
      .tokenize();

    if (!tokens) {
      this.reporter.addError(
        node.path.loc,
        `Failed to tokenize module '${moduleName}'`,
      );
      throw new Error(`Failed to tokenize module '${moduleName}'`);
    }

    const ast = new Parser(tokens, this.reporter).parse();

    if (!ast) {
      this.reporter.addError(
        node.path.loc,
        `Failed to parse module '${moduleName}'`,
      );
      throw new Error(`Failed to parse module '${moduleName}'`);
    }

    const allowedNodes: Set<string> = new Set();
    allowedNodes.add("FunctionDeclaration")
      .add("ImportStatement");

    const semantic = Semantic.getInstance(this.reporter);
    const finalAst = semantic.semantic(
      ast as Program,
    );

    for (const stmt of finalAst.body!) {
      if (!allowedNodes.has(stmt.kind)) {
        continue;
      }

      // if (
      //   stmt.kind == "ImportStatement" &&
      //   this.importedModules.has((stmt as ImportStatement).path.value)
      // ) {
      //   this.reporter.addError(
      //     node.path.loc,
      //     `Module '${
      //       (stmt as ImportStatement).path.value
      //     }' is already imported`,
      //     [
      //       this.reporter.makeSuggestion(
      //         "Remove the import in the file you are importing, not the one being imported.",
      //       ),
      //     ],
      //   );
      //   throw new Error(
      //     `Module '${
      //       (stmt as ImportStatement).path.value
      //     }' is already imported`,
      //   );
      // }

      this.externalNodes.push(stmt);
    }

    return node;
  }

  private analyzeCallExpr(node: CallExpr): CallExpr {
    const funcName = node.callee.value;

    if (!this.availableFunctions.has(funcName)) {
      this.reporter.addError(
        node.callee.loc,
        `Function '${funcName}' is not defined`,
      );
      throw new Error(`Function '${funcName}' is not defined`);
    }

    const funcInfo = this.availableFunctions.get(funcName)!;

    if (
      !funcInfo.isVariadic && node.arguments.length !== funcInfo.params.length
    ) {
      this.reporter.addError(
        node.loc,
        `Function '${funcName}' expects ${funcInfo.params.length} arguments, but got ${node.arguments.length}`,
      );
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

    for (let i = 0; i < node.arguments.length; i++) {
      // Analisa o nó do argumento primeiro
      node.arguments[i] = this.analyzeNode(node.arguments[i]);

      const argType = node.arguments[i].type;
      const param = funcInfo.params[i];

      // Se for função variádica e não tiver mais parâmetros definidos, continua
      if (param === undefined && funcInfo.isVariadic) {
        continue;
      }

      const paramType = typeof param === "string"
        ? param as TypesNative
        : param.type as TypesNative;

      // Caso especial para conversão para string
      if (argType !== "string" && paramType === "string") {
        node.arguments[i].type = "string";
        node.arguments[i].value = String(node.arguments[i].value);
        continue;
      }

      // Verifica compatibilidade de tipos
      if (!this.typeChecker.areTypesCompatible(argType, paramType)) {
        this.reporter.addError(
          node.arguments[i].loc,
          `Argument ${
            i + 1
          } of function '${funcName}' expects type '${paramType}', but got '${argType}'`,
        );
        throw new Error(
          `Argument ${
            i + 1
          } of function '${funcName}' expects type '${paramType}', but got '${argType}'`,
        );
      }

      // Se os tipos são compatíveis mas diferentes, realiza a conversão
      if (
        this.typeChecker.areTypesCompatible(argType, paramType) &&
        argType !== paramType
      ) {
        if (!node.arguments[i].kind.includes("Literal")) {
          // this.reporter.addError(
          //   node.arguments[i].loc,
          //   `You passed an argument of type ${argType} but a ${paramType} was expected.`,
          //   [
          //     this.reporter.makeSuggestion(
          //       "Do type conversion, use the 'types' library",
          //     ),
          //   ],
          // );
          // new Error(
          //   `You passed an argument of type ${argType} but a ${paramType} was expected.`,
          // );
        }

        node.arguments[i].llvmType = this.typeChecker.mapToLLVMType(paramType);
        node.arguments[i].type = paramType;
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
      left,
      right,
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
      this.reporter.addError(
        id.loc,
        `Variable '${id.value}' is not defined`,
      );
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
      this.reporter.addError(
        decl.id.loc,
        `Variable '${decl.id.value}' is already defined in this scope`,
      );
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
      this.reporter.addError(
        expr.loc,
        "Cannot increment non-variable expression",
      );
      throw new Error(
        `Cannot increment non-variable expression at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    if (analyzedValue.type !== "int" && analyzedValue.type !== "float") {
      this.reporter.addError(
        expr.loc,
        `Cannot increment variable of type '${analyzedValue.type}'`,
      );
      throw new Error(
        `Cannot increment variable of type '${analyzedValue.type}' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    const symbol = this.lookupSymbol((analyzedValue as Identifier).value);
    if (symbol && !symbol.mutable) {
      this.reporter.addError(
        expr.loc,
        `Cannot increment immutable variable '${
          (analyzedValue as Identifier).value
        }'`,
      );
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
      this.reporter.addError(
        expr.loc,
        "Cannot decrement non-variable expression",
      );
      throw new Error(
        `Cannot decrement non-variable expression at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    if (analyzedValue.type !== "int" && analyzedValue.type !== "float") {
      this.reporter.addError(
        expr.loc,
        `Cannot decrement variable of type '${analyzedValue.type}'`,
      );
      throw new Error(
        `Cannot decrement variable of type '${analyzedValue.type}' at ${expr.loc.line}:${expr.loc.start}`,
      );
    }

    const symbol = this.lookupSymbol((analyzedValue as Identifier).value);
    if (symbol && !symbol.mutable) {
      this.reporter.addError(
        expr.loc,
        `Cannot decrement immutable variable '${
          (analyzedValue as Identifier).value
        }'`,
      );
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
      console.log("Cannot pop the global scope");
      Deno.exit(-1);
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

  public lookupSymbol(id: string): SymbolInfo | undefined {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      const symbol = scope.get(id);
      if (symbol) {
        return symbol;
      }
    }
    return undefined;
  }

  private unsetSymbol(id: string): boolean {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      const symbol = scope.get(id);
      if (symbol) {
        scope.delete(id);
        this.identifiersUsed.delete(id);
        return true;
      }
    }
    return false;
  }
}
