/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { Lexer } from "../frontend/lexer/lexer.ts";
import { Loc, Token } from "../frontend/lexer/token.ts";
import {
  ArrayLiteral,
  AssignmentDeclaration,
  CallExpr,
  createArrayType,
  createTypeInfo,
  ElifStatement,
  ElseStatement,
  ExternStatement,
  ForRangeStatement,
  FunctionArgs,
  FunctionDeclaration,
  IfStatement,
  ImportStatement,
  LLVMType,
  ReturnStatement,
  TypeInfo,
  typeInfoToString,
  UnaryExpr,
  WhileStatement,
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

export interface SymbolInfo {
  id: string;
  sourceType: TypeInfo;
  llvmType: LLVMType;
  mutable: boolean;
  initialized: boolean;
  loc: Loc;
}

export class Semantic {
  private static instance: Semantic | null;
  public scopeStack: Map<string, SymbolInfo>[] = [];
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

  public resetInstance() {
    Semantic.instance = null;
  }

  public semantic(program: Program): Program {
    this.scopeStack = [new Map()];

    const analyzedNodes: Stmt[] = [];

    for (const node of program.body || []) {
      try {
        analyzedNodes.push(this.analyzeNode(node));
      } catch (_error: any) {
        console.log(_error);
        // Ignore
      }
    }

    const analyzedProgram: Program = {
      ...program,
      body: [...this.externalNodes, ...analyzedNodes],
    };

    return analyzedProgram;
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
      case "ForRangeStatement":
        analyzedNode = this.analyzeForRangeStmt(node as ForRangeStatement);
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
      case "WhileStatement":
        analyzedNode = this.analyzeWhileStatement(node as WhileStatement);
        break;
      case "FunctionDeclaration":
        analyzedNode = this.analyzeFnDeclaration(node as FunctionDeclaration);
        break;
      case "ExternStatement":
        analyzedNode = this.analyzeExternStatement(node as ExternStatement);
        break;
      case "IncrementExpr":
        analyzedNode = this.analyzeIncrementExpr(node as IncrementExpr);
        break;
      case "DecrementExpr":
        analyzedNode = this.analyzeDecrementExpr(node as DecrementExpr);
        break;
      case "UnaryExpr":
        analyzedNode = this.analyzeUnaryExpr(node as UnaryExpr);
        break;
      case "ArrayLiteral":
        analyzedNode = this.analyzeArrayLiteral(node as ArrayLiteral);
        break;
      case "StringLiteral":
      case "IntLiteral":
      case "FloatLiteral":
      case "BinaryLiteral":
      case "NullLiteral":
        analyzedNode = {
          ...node,
          llvmType: this.typeChecker.mapToLLVMType(node.type.baseType),
        };
        break;
      default: {
        this.reporter.addError(node.loc, `Unknown node kind: ${node.kind}`);
        throw new Error(`Unknown node kind: ${node.kind}`);
      }
    }

    if (!analyzedNode.llvmType) {
      analyzedNode.llvmType = this
        .typeChecker.mapToLLVMType(
          analyzedNode.type.baseType == undefined
            ? analyzedNode.type as unknown as TypesNative
            : analyzedNode.type.baseType,
        );
    }

    return analyzedNode;
  }

  /**
   * Analisa um literal de array, verificando seus elementos, dimensões e tipo
   */
  private analyzeArrayLiteral(node: ArrayLiteral): ArrayLiteral {
    // Analisar cada elemento do array
    const analyzedElements: Expr[] = [];
    let commonElementType: TypeInfo | undefined = undefined;

    for (let i = 0; i < node.value.length; i++) {
      const analyzedElement = this.analyzeNode(node.value[i]) as Expr;
      analyzedElements.push(analyzedElement);

      // Determinar o tipo comum do array
      if (i === 0) {
        commonElementType = analyzedElement.type;
      } else if (commonElementType && analyzedElement.type) {
        // Verificar se todos os elementos têm o mesmo tipo
        if (
          !this.typeChecker.areTypesCompatible(
            analyzedElement.type.baseType,
            commonElementType.baseType,
          )
        ) {
          this.reporter.addError(
            analyzedElement.loc,
            `Array elements must have compatible types. Found '${
              typeInfoToString(analyzedElement.type)
            }' but expected '${typeInfoToString(commonElementType)}'`,
          );
          throw new Error(
            `Array elements have incompatible types at ${analyzedElement.loc.line}:${analyzedElement.loc.start}`,
          );
        }
      }
    }

    // Se o array estiver vazio, usar null como tipo base
    const baseType = commonElementType?.baseType ?? "null";

    // Criar ou atualizar o tipo do array
    const arrayType = createArrayType(
      baseType as TypesNative,
      node.type?.dimensions ?? 1,
    );

    // Verificar arrays multidimensionais (arrays de arrays)
    if (node.value.length > 0 && node.value[0].kind === "ArrayLiteral") {
      // É um array multidimensional
      const nestedArray = node.value[0] as ArrayLiteral;
      arrayType.dimensions = (nestedArray.type?.dimensions ?? 0) + 1;

      // Verificar se todos os subarrays têm a mesma dimensão
      for (let i = 1; i < node.value.length; i++) {
        if (node.value[i].kind === "ArrayLiteral") {
          const subArray = node.value[i] as ArrayLiteral;
          if (
            (subArray.type?.dimensions ?? 0) !==
              (nestedArray.type?.dimensions ?? 0)
          ) {
            this.reporter.addError(
              subArray.loc,
              `Inconsistent array dimensions in multidimensional array`,
            );
            throw new Error(
              `Inconsistent array dimensions in multidimensional array at ${subArray.loc.line}:${subArray.loc.start}`,
            );
          }
        } else {
          this.reporter.addError(
            node.value[i].loc,
            `Expected array literal but found ${node.value[i].kind}`,
          );
          throw new Error(
            `Expected array literal but found ${node.value[i].kind} at ${
              node.value[i].loc.line
            }:${node.value[i].loc.start}`,
          );
        }
      }
    }

    return {
      ...node,
      value: analyzedElements,
      type: arrayType,
      elementType: commonElementType,
      llvmType: this.typeChecker.mapToLLVMType(arrayType.baseType),
    };
  }

  private analyzeUnaryExpr(node: UnaryExpr): UnaryExpr {
    node.operand = this.analyzeNode(node.operand) as Expr;

    if (node.operator === "*") {
      if (!this.typeChecker.isPointerType(node.operand.type)) {
        this.reporter.addError(
          node.loc,
          `Cannot dereference non-pointer type '${
            typeInfoToString(node.operand.type)
          }'`,
        );
        throw new Error(
          `Cannot dereference non-pointer type '${
            typeInfoToString(node.operand.type)
          }' at ${node.loc.line}:${node.loc.start}`,
        );
      }

      let dereferenceCount = 1;
      let currentExpr: Expr = node.operand;

      while (
        currentExpr.kind === "UnaryExpr" &&
        (currentExpr as UnaryExpr).operator === "*"
      ) {
        dereferenceCount++;
        currentExpr = (currentExpr as UnaryExpr).operand;
      }

      const pointerLevel = node.operand.type.pointerLevel || 0;

      if (dereferenceCount > pointerLevel) {
        this.reporter.addError(
          node.loc,
          `Cannot dereference pointer of level ${pointerLevel} with ${dereferenceCount} dereference operations`,
        );
        throw new Error(
          `Cannot dereference pointer of level ${pointerLevel} with ${dereferenceCount} dereference operations at ${node.loc.line}:${node.loc.start}`,
        );
      }

      const newType = { ...node.operand.type };
      newType.pointerLevel = Math.max(0, pointerLevel);
      newType.isPointer = newType.pointerLevel > 0;

      node.llvmType = newType.pointerLevel === 0
        ? this.typeChecker.mapToLLVMType(newType.baseType)
        : LLVMType.PTR;
      node.type = newType;
    } else if (node.operator === "&") {
      if (node.operand.kind !== "Identifier") {
        this.reporter.addError(
          node.loc,
          `Cannot take address of non-variable expression`,
        );
        throw new Error(
          `Cannot take address of non-variable expression at ${node.loc.line}:${node.loc.start}`,
        );
      }

      const newType = { ...node.operand.type };
      newType.pointerLevel = (newType.pointerLevel || 0) + 1;
      newType.isPointer = true;
      newType.baseType = "null";

      node.type = newType;
      node.llvmType = LLVMType.PTR;
    }

    return node;
  }

  // private analyzeUnaryExpr(node: UnaryExpr): UnaryExpr {
  //   node.operand = this.analyzeNode(node.operand) as Expr;

  //   if (node.operator === "*") {
  //     if (!this.typeChecker.isPointerType(node.operand.type)) {
  //       this.reporter.addError(
  //         node.loc,
  //         `Cannot dereference non-pointer type '${
  //           typeInfoToString(node.operand.type)
  //         }'`,
  //       );
  //       throw new Error(
  //         `Cannot dereference non-pointer type '${
  //           typeInfoToString(node.operand.type)
  //         }' at ${node.loc.line}:${node.loc.start}`,
  //       );
  //     }

  //     node.type = node.operand.type;
  //     node.llvmType = this.typeChecker.mapToLLVMType(node.type.baseType);
  //   }

  //   console.log(this.scopeStack[0].get(node.operand.value));
  //   return node;
  // }

  private analyzeWhileStatement(node: WhileStatement): WhileStatement {
    node.condition = this.analyzeNode(node.condition);

    for (let i = 0; i < node.block.length; i++) {
      node.block[i] = this.analyzeNode(node.block[i]);
    }

    return node;
  }

  private analyzeExternStatement(node: ExternStatement): ExternStatement {
    for (const func of node.functions) {
      const funcName = func.name;

      if (this.availableFunctions.has(funcName)) {
        this.reporter.addError(
          node.loc,
          `Function '${funcName}' is already defined`,
        );
        throw new Error(`Function '${funcName}' is already defined.`);
      }

      for (const arg of func.args) {
        const llvmType = this.typeChecker.mapToLLVMType(
          arg.type.baseType as TypesNative,
        );
        arg.llvmType = llvmType;
      }

      const funcInfo = {
        name: funcName,
        params: func.args.map((arg) => ({
          name: arg.name,
          type: arg.type,
          llvmType: this.typeChecker.mapToLLVMType(arg.type.baseType),
        })),
        returnType: func.returnType,
        llvmType: this.typeChecker.mapToLLVMType(func.returnType.baseType),
        isVariadic: false,
        loc: node.loc,
      };

      this.availableFunctions.set(funcName, funcInfo as Function);
    }

    return node;
  }

  private analyzeForRangeStmt(node: ForRangeStatement): ForRangeStatement {
    node.from = this.analyzeNode(node.from);
    node.to = this.analyzeNode(node.to);

    if (node.id) {
      this.defineSymbol({
        id: node.id.value,
        sourceType: createTypeInfo("int"),
        llvmType: LLVMType.I32,
        mutable: true,
        initialized: false,
        loc: node.id.loc,
      });
    }

    if (node.step) {
      node.step = this.analyzeNode(node.step);
    }

    for (let i = 0; i < node.block.length; i++) {
      node.block[i] = this.analyzeNode(node.block[i]);
    }

    return node;
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
      // @ts-ignore: Dont have error
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

    if (symbol.llvmType != analyzedValue.llvmType) {
      this.reporter.addError(
        node.loc,
        `The variable was initially ${symbol.sourceType}, but you passed a value of type ${analyzedValue.type}.`,
      );
      throw new Error(
        `The variable was initially ${symbol.sourceType}, but you passed a value of type ${analyzedValue.type}.`,
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

      const llvmType = this.typeChecker.mapToLLVMType(arg.type.baseType);
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

    const returnType = node.type || createTypeInfo("void");

    const returnLLVMType = this.typeChecker.mapToLLVMType(returnType.baseType);

    const funcInfo = {
      name: funcName,
      params: node.args.map((arg) => ({
        name: arg.id.value,
        type: arg.type,
        llvmType: this.typeChecker.mapToLLVMType(arg.type.baseType),
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

        const returnExpr = (analyzedStmt as ReturnStatement).value;
        if (returnExpr) {
          const returnExprType = returnExpr.type;

          if (
            !this.typeChecker.areTypesCompatible(
              returnExprType,
              returnType.baseType,
            ) &&
            returnType.baseType !== "void"
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

    if (returnType.baseType !== "void" && !hasReturn) {
      this.reporter.addError(
        node.loc,
        `Function '${funcName}' is declared to return '${returnType}' but has no return statement`,
      );
      throw new Error(
        `Function '${funcName}' is declared to return '${returnType}' but has no return statement`,
      );
    }

    const scope = this.currentScope();
    this.popScope();

    return {
      ...node,
      args: analyzedArgs,
      block: analyzedBlock,
      type: returnType,
      llvmType: returnLLVMType,
      scope: scope,
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

    const filePath = node.loc.dir + moduleName;
    let file = "";

    try {
      file = Deno.readTextFileSync(filePath);
    } catch (_error) {
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

    node.type = funcInfo.returnType as TypeInfo;
    node.llvmType = funcInfo.llvmType as LLVMType;

    if (
      !this.identifiersUsed.has(funcInfo.name)
    ) {
      this.identifiersUsed.add(funcInfo.name);
    }

    for (let i = 0; i < node.arguments.length; i++) {
      node.arguments[i] = this.analyzeNode(node.arguments[i]);

      const argType = node.arguments[i].type;
      const param = funcInfo.params[i];

      if (param === undefined && funcInfo.isVariadic) {
        continue;
      }

      const paramType = typeof param === "string"
        ? param as TypesNative
        : param.type.baseType as TypesNative;

      if (argType.baseType !== "string" && paramType === "string") {
        node.arguments[i].type.baseType = "string";
        node.arguments[i].value = String(node.arguments[i].value);
        continue;
      }

      if (!this.typeChecker.areTypesCompatible(argType.baseType, paramType)) {
        this.reporter.addError(
          node.arguments[i].loc,
          `Argument ${
            i + 1
          } of function '${funcName}' expects type '${paramType}', but got '${argType}'`,
        );
        throw new Error(
          `Argument ${
            i + 1
          } of function '${funcName}' expects type '${paramType}', but got '${argType.baseType}'`,
        );
      }

      if (
        this.typeChecker.areTypesCompatible(argType.baseType, paramType) &&
        argType.baseType !== paramType
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
        node.arguments[i].type.baseType = paramType;
      }
    }

    return node;
  }

  private analyzeBinaryExpr(expr: BinaryExpr): BinaryExpr {
    const left = this.analyzeNode(expr.left) as Expr;
    const right = this.analyzeNode(expr.right) as Expr;

    const resultType = this.typeChecker.checkBinaryExprTypes(
      left,
      right,
      expr.operator,
    );
    const llvmResultType = this.typeChecker.mapToLLVMType(resultType.baseType);

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

    const actualType = analyzedValue.type;

    // Check pointer type compatibility
    if (
      this.typeChecker.isPointerType(actualType) &&
      !this.typeChecker.isPointerType(decl.type)
    ) {
      this.reporter.addError(
        decl.loc,
        `Cannot assign pointer type '${
          typeInfoToString(actualType)
        }' to non-pointer type '${typeInfoToString(decl.type)}'`,
      );
      throw new Error(
        `Cannot assign pointer type '${
          typeInfoToString(actualType)
        }' to non-pointer type '${typeInfoToString(decl.type)}'`,
      );
    }

    // Check pointer depth compatibility
    if (
      this.typeChecker.isPointerType(actualType) &&
      this.typeChecker.isPointerType(decl.type)
    ) {
      const actualDepth = actualType.pointerLevel;
      const declDepth = decl.type.pointerLevel;

      if (actualDepth !== declDepth) {
        this.reporter.addError(
          decl.loc,
          `Pointer type mismatch: '${
            typeInfoToString(actualType)
          }' cannot be assigned to '${typeInfoToString(decl.type)}'`,
        );
        throw new Error(
          `Pointer type mismatch: '${
            typeInfoToString(actualType)
          }' cannot be assigned to '${typeInfoToString(decl.type)}'`,
        );
      }
    }

    const llvmType = this.typeChecker.mapToLLVMType(actualType.baseType);
    decl.type.baseType = actualType.baseType;

    this.defineSymbol({
      id: decl.id.value,
      sourceType: decl.type,
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

    if (
      analyzedValue.type.baseType !== "int" &&
      analyzedValue.type.baseType !== "float"
    ) {
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
      llvmType: (analyzedValue as Expr).llvmType,
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

    if (
      analyzedValue.type.baseType !== "int" &&
      analyzedValue.type.baseType !== "float"
    ) {
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
      llvmType: (analyzedValue as Identifier).llvmType,
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
