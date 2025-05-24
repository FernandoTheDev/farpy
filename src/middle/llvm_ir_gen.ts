/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import {
  ArrayLiteral,
  ArrowExpression,
  AssignmentDeclaration,
  BinaryExpr,
  BinaryLiteral,
  CallExpr,
  CastExpr,
  ElifStatement,
  Expr,
  ExternStatement,
  FloatLiteral,
  ForRangeStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IndexAccess,
  IntLiteral,
  LLVMType,
  NullLiteral,
  Program,
  ReturnStatement,
  Stmt,
  StringLiteral,
  StructExpr,
  StructPAssignment,
  StructStatement,
  TypeInfo,
  UnaryExpr,
  VariableDeclaration,
  WhileStatement,
} from "../frontend/parser/ast.ts";
import {
  createStringGlobal,
  IRValue,
  LLVMBasicBlock,
  LLVMFunction,
  LLVMModule,
} from "../ts-ir/index.ts";
import { Semantic } from "./semantic.ts";
import { StdLibFunction } from "./std_lib_module_builder.ts";
import { TypeChecker } from "./type_checker.ts";

export class LLVMIRGenerator {
  private static instance: LLVMIRGenerator | null;
  private module: LLVMModule = new LLVMModule();
  private variables: Map<string, IRValue> = new Map();
  private stringConstants: Map<string, IRValue> = new Map();
  private declaredFuncs: Set<string> = new Set();
  private currentLoopIncBlock: LLVMBasicBlock | null = null;
  private currentLoopBlock: LLVMBasicBlock | null = null;
  public externs: string[] = []; // Bad
  private readonly reporter: DiagnosticReporter;
  private readonly debug: boolean;
  protected instance: Semantic;
  private lastStructPtr: IRValue = this.makeIrValue("0", "i32");

  private constructor(reporter: DiagnosticReporter, debug: boolean) {
    this.reporter = reporter;
    this.debug = debug;
    this.instance = Semantic.getInstance(this.reporter);
  }

  public static getInstance(
    reporter: DiagnosticReporter,
    debug: boolean,
  ): LLVMIRGenerator {
    if (!LLVMIRGenerator.instance) {
      LLVMIRGenerator.instance = new LLVMIRGenerator(reporter, debug);
    }
    return LLVMIRGenerator.instance;
  }

  public resetInstance() {
    LLVMIRGenerator.instance = null;
  }

  public generateIR(
    program: Program,
    instance: Semantic,
    file: string,
  ): string {
    this.reset();
    this.instance = instance;

    this.module.addExternal(`source_filename = "${file}"`);
    const target = this.getTargetTriple();
    if (target) this.module.addExternal(`target triple = "${target}"\n`);

    this.generateProgram(program);
    return this.module.toString();
  }

  private reset(): void {
    this.variables = new Map();
    this.stringConstants = new Map();
  }

  private generateProgram(program: Program): void {
    const mainFunc = new LLVMFunction("main", "i32", []);
    const entry = mainFunc.createBasicBlock("entry");
    mainFunc.setCurrentBasicBlock(entry);

    for (const node of program.body!) {
      this.generateNode(node, mainFunc);
    }

    this.module.addFunction(mainFunc);
    mainFunc.getCurrentBasicBlock().retInst({ value: "0", type: "i32" });
  }

  private generateNode(
    node: Stmt | Expr,
    main: LLVMFunction,
    _entry: LLVMBasicBlock | null = null,
  ): IRValue {
    const entry = _entry == null ? main.getCurrentBasicBlock() : _entry;

    switch (node.kind) {
      case "BinaryExpr":
        return this.generateBinaryExpr(node as BinaryExpr, entry, main);
      case "Identifier":
        return this.generateIdentifier(node as Identifier, entry, main);
      case "VariableDeclaration":
        return this.generateVariableDeclaration(
          node as VariableDeclaration,
          entry,
          main,
        );
      case "ElifStatement":
      case "IfStatement":
        return this.generateIfStmt(
          node.kind == "IfStatement"
            ? node as IfStatement
            : node as ElifStatement,
          entry,
          main as LLVMFunction,
        );
      case "AssignmentDeclaration":
        return this.generateAssignment(
          node as AssignmentDeclaration,
          entry,
          main,
        );
      case "FunctionDeclaration":
        return this.generateFnDeclaration(
          node as FunctionDeclaration,
          entry,
          main,
        );
      case "ForRangeStatement":
        return this.generateForRangeStmt(
          node as ForRangeStatement,
          entry,
          main,
        );
      case "WhileStatement":
        return this.generateWhileStatement(
          node as WhileStatement,
          entry,
          main,
        );
      case "ExternStatement":
        return this.generateExternStatement(
          node as ExternStatement,
          entry,
          main,
        );
      case "UnaryExpr":
        return this.generateUnaryExpr(
          node as UnaryExpr,
          entry,
          main,
        );
      case "StructStatement":
        return this.generateStructStatement(
          node as StructStatement,
          entry,
          main,
        );
      case "StructExpr":
        return this.generateStructExpr(
          node as StructExpr,
          entry,
          main,
        );
      case "StructPAssignment":
        return this.generateStructPAssignment(
          node as StructPAssignment,
          entry,
          main,
        );
      case "ArrowExpression":
        return this.generateArrowExpression(
          node as ArrowExpression,
          entry,
          main,
        );
      case "ArrayLiteral":
        return this.generateArrayLiteral(node as ArrayLiteral, entry, main);
      case "StringLiteral":
        return this.generateStringLiteral(node as StringLiteral, entry, main);
      case "IntLiteral":
        return this.generateIntLiteral(node as IntLiteral, entry, main);
      case "FloatLiteral":
        return this.generateFloatLiteral(node as FloatLiteral, entry, main);
      case "BinaryLiteral":
        return this.generateBinaryLiteral(node as BinaryLiteral, entry, main);
      case "NullLiteral":
        return this.generateNullLiteral(node as NullLiteral, entry, main);
      case "BooleanLiteral":
        return this.makeIrValue(String(Number(node.value)), "i1");
      case "CallExpr":
        return this.generateCallExpr(node as CallExpr, entry, main);
      case "CastExpr":
        return this.generateCastExpr(node as CastExpr, entry, main);
      case "ImportStatement":
        return this.makeIrValue("0", "i32");
      case "ReturnStatement":
        return this.makeReturnStatement(node as ReturnStatement, entry, main);
      case "IndexAccess":
        return this.generateIndexAccess(node as IndexAccess, entry, main);
      default:
        throw new Error(
          `Unsupported node kind for IR generation: ${node.kind}`,
        );
    }
  }

  private generateIndexAccess(
    node: IndexAccess,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const element = this.generateNode(node.target, main);
    const index = this.generateNode(node.index, main);

    // Array
    if (element.type.includes("x")) {
      return entry.getArrayElement(
        element.type[element.type.length - 1] == "*"
          ? element
          : entry.toPtr(element),
        index,
      );
    }

    // String
    if (element.type.includes("i8")) {
      return entry.getStringElementPtr(
        element.type[element.type.length - 1] == "*"
          ? element
          : entry.toPtr(element),
        index,
      );
    }

    this.reporter.addError(node.target.loc, "Unsupported type for IndexAcess");
    throw new Error(
      `Unsupported type for IndexAcess`,
    );
  }

  private generateArrowExpression(
    node: ArrowExpression,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    return entry.getStructField(
      this.lastStructPtr,
      node.index!,
      node.to.llvmType!,
    );
  }

  private generateStructPAssignment(
    node: StructPAssignment,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const value = this.generateNode(node.to.value, main);
    entry.setStructField(
      this.lastStructPtr,
      node.index!,
      node.to.value.llvmType!,
      value,
    );
    return value;
  }

  private generateStructExpr(
    node: StructExpr,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    this.lastStructPtr = entry.allocaStructInst(node.llvmType!);
    return this.lastStructPtr;
  }

  private generateStructStatement(
    node: StructStatement,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    const types: string[] = [];

    for (const propertie of node.body) {
      types.push(String(propertie.llvmType));
    }

    this.module.addGlobal(entry.createStructType(node.name.value, types));
    return this.makeIrValue("0", "i32");
  }

  private generateCastExpr(
    node: CastExpr,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const value = this.generateNode(node.expr, main);
    return entry.convertValueToType(value, node.llvmType!);
  }

  private generateArrayLiteral(
    node: ArrayLiteral,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const values: string[] = [];

    for (const value of node.value) {
      values.push(value.value);
    }

    const ptr = entry.allocaArrayInst(node.llvmType!, node.value.length);

    for (let i = 0; i < values.length; i++) {
      entry.setArrayElement(
        ptr,
        this.makeIrValue(String(i), "i32"),
        this.generateNode(node.value[i], main),
      );
    }

    return ptr;
  }

  private generateUnaryExpr(
    node: UnaryExpr,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const operand = this.generateNode(node.operand, main);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    switch (node.operator) {
      case "*": { // Pointer dereference
        // Check if operand is a pointer type
        if (!operand.type.endsWith("*") && operand.type != "ptr") {
          this.reporter.addError(
            node.loc,
            `Cannot dereference non-pointer type ${operand.type}`,
          );
          console.log(`Cannot dereference non-pointer type ${operand.type}`);
          return this.makeIrValue("0", "i32"); // Default error value
        }
        return entry.loadInst({ value: operand.value, type: operand.type });
      }

      case "&": // Address-of operator
        // Check if operand is already an address (pointer) or has been loaded
        if (
          operand.value.startsWith("%") &&
          !this.variables.has(node.operand.value)
        ) {
          // The operand is already an address or temporary variable
          return {
            value: operand.value,
            type: operand.type == "ptr"
              ? `${operand.type}`
              : `${operand.type}*`,
          };
        } else if (node.operand.kind === "Identifier") {
          // For identifiers, return the original allocated address (not the loaded value)
          const varPtr = this.variables.get((node.operand as Identifier).value);
          if (varPtr) {
            return {
              value: varPtr.value,
              type: operand.type == "ptr"
                ? `${operand.type}`
                : `${operand.type}*`,
            };
          }
        }
        this.reporter.addError(
          node.loc,
          `Cannot take address of ${node.operand.kind}`,
        );
        return this.makeIrValue("0", "i32"); // Default error value

      case "-":
        if (operand.type.startsWith("i")) {
          return entry.subInst(this.makeIrValue("0", operand.type), operand);
        } else if (operand.type === "double" || operand.type === "float") {
          return entry.fnegInst(operand);
        }
        this.reporter.addError(
          node.loc,
          `Cannot negate non-numeric type ${operand.type}`,
        );
        return this.makeIrValue("0", "i32"); // Default error value

      case "!": {
        let boolValue: IRValue;
        if (operand.type !== "i1") {
          if (operand.type.startsWith("i")) {
            boolValue = entry.icmpInst(
              "ne",
              operand,
              this.makeIrValue("0", operand.type),
            );
          } else if (operand.type === "double" || operand.type === "float") {
            boolValue = entry.fcmpInst(
              "one",
              operand,
              this.makeIrValue("0.0", operand.type),
            );
          } else if (operand.type.endsWith("*")) {
            // For pointers, compare with null
            boolValue = entry.icmpInst(
              "ne",
              operand,
              this.makeIrValue("null", operand.type),
            );
          } else {
            this.reporter.addError(
              node.loc,
              `Cannot apply logical not to type ${operand.type}`,
            );
            return this.makeIrValue("0", "i32"); // Default error value
          }
        } else {
          boolValue = operand;
        }

        return entry.xorInst(boolValue, this.makeIrValue("1", "i1"));
      }
      default:
        this.reporter.addError(
          node.loc,
          `Unsupported unary operator: ${node.operator}`,
        );
        return this.makeIrValue("0", "i32"); // Default error value
    }
  }

  private generateExternStatement(
    node: ExternStatement,
    _entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    for (const fn of node.functions) {
      const typeChecker = new TypeChecker(this.reporter);

      const args = fn.args
        .map((arg) => {
          const argType = arg.llvmType
            ? typeChecker.mapToLLVMType(arg.llvmType)
            : typeChecker.mapToLLVMType(arg.type.baseType as LLVMType);

          return argType;
        })
        .join(", ");

      const returnType = typeChecker.mapToLLVMType(
        fn.returnType.baseType as LLVMType,
      );

      this.module.addGlobal(
        `declare ${returnType} @${fn.name}(${args})\n`,
      );
    }

    this.externs.push(node.code);
    return { value: "0", type: "i32" } as IRValue;
  }

  private generateAssignment(
    node: AssignmentDeclaration,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const value = this.generateNode(node.value, main);
    const ptr = this.variables.get(node.id.value);
    entry.storeInst(value, ptr!);
    return ptr!;
  }

  // Versão corrigida dos métodos de geração de loops

  private generateForRangeStmt(
    node: ForRangeStatement,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    const condBlock = main.createBasicBlock("for.cond" + main.nextBlockId());
    const bodyBlock = main.createBasicBlock("for.body" + main.nextBlockId());
    const incBlock = main.createBasicBlock("for.inc" + main.nextBlockId());
    const endBlock = main.createBasicBlock("for.end" + main.nextBlockId());

    // Store outer scope variables to restore after the loop
    const outerVariables = new Map(this.variables);

    // Store the previous loop context
    const previousLoopIncBlock = this.currentLoopIncBlock;
    const previousLoopBlock = this.currentLoopBlock;

    const fromExpr = this.generateNode(node.from, main);
    const toExpr = this.generateNode(node.to, main);

    let counterVar: IRValue;
    let counterName: string;

    if (node.id) {
      counterName = node.id.value;
      counterVar = entry.allocaInst("i32");
      this.variables.set(counterName, counterVar);
    } else {
      counterName = "_for_idx" + main.nextBlockId();
      counterVar = entry.allocaInst("i32");
      this.variables.set(counterName, counterVar);
    }

    entry.storeInst(fromExpr, counterVar);

    let stepExpr: IRValue;
    if (node.step) {
      stepExpr = this.generateNode(node.step, main);
    } else {
      stepExpr = this.makeIrValue("1", "i32");
    }

    // Branch to condition block from current block
    entry.brInst(condBlock.label);
    main.setCurrentBasicBlock(condBlock);

    const counterVal = condBlock.loadInst(counterVar);

    const positiveComp = node.inclusive ? "sle" : "slt";
    const negativeComp = node.inclusive ? "sge" : "sgt";

    // Check step direction
    const isPositiveStep = condBlock.nextTemp();
    condBlock.add(
      `${isPositiveStep} = icmp sgt ${stepExpr.type} ${stepExpr.value}, 0`,
    );

    const condPositive = condBlock.nextTemp();
    const condNegative = condBlock.nextTemp();
    const condition = condBlock.nextTemp();

    condBlock.add(
      `${condPositive} = icmp ${positiveComp} ${counterVal.type} ${counterVal.value}, ${toExpr.value}`,
    );
    condBlock.add(
      `${condNegative} = icmp ${negativeComp} ${counterVal.type} ${counterVal.value}, ${toExpr.value}`,
    );
    condBlock.add(
      `${condition} = select i1 ${isPositiveStep}, i1 ${condPositive}, i1 ${condNegative}`,
    );

    condBlock.condBrInst(
      { value: condition, type: "i1" },
      bodyBlock.label,
      endBlock.label,
    );

    // Generate loop body
    main.setCurrentBasicBlock(bodyBlock);

    // Set the current loop context for nested loops
    this.currentLoopIncBlock = incBlock;
    this.currentLoopBlock = condBlock;

    for (const stmt of node.block) {
      this.generateNode(stmt, main);
    }

    // Restore the previous loop context
    this.currentLoopIncBlock = previousLoopIncBlock;
    this.currentLoopBlock = previousLoopBlock;

    // Only add branch to inc block if body doesn't already terminate
    const currentBodyBlock = main.getCurrentBasicBlock();
    if (
      !currentBodyBlock.instructions.some((instr) =>
        instr.trim().startsWith("ret ") || instr.trim().startsWith("br ")
      )
    ) {
      currentBodyBlock.brInst(incBlock.label);
    }

    // Generate increment block
    main.setCurrentBasicBlock(incBlock);
    const counterCurr = incBlock.loadInst(counterVar);
    const counterNext = incBlock.addInst(counterCurr, stepExpr);
    incBlock.storeInst(counterNext, counterVar);
    incBlock.brInst(condBlock.label);

    // Set current block to end block for continuation
    main.setCurrentBasicBlock(endBlock);

    // Restore the outer scope variables
    this.variables = outerVariables;

    return this.makeIrValue("0", "i32");
  }

  private generateWhileStatement(
    node: WhileStatement,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    const condBlock = main.createBasicBlock("while.cond" + main.nextBlockId());
    const bodyBlock = main.createBasicBlock("while.body" + main.nextBlockId());
    const endBlock = main.createBasicBlock("while.end" + main.nextBlockId());

    // Store the previous loop context
    const previousLoopIncBlock = this.currentLoopIncBlock;
    const previousLoopBlock = this.currentLoopBlock;

    // Branch to condition block
    entry.brInst(condBlock.label);
    main.setCurrentBasicBlock(condBlock);

    // Evaluate the while condition
    const cond = this.generateNode(node.condition, main);
    condBlock.condBrInst(cond, bodyBlock.label, endBlock.label);

    // Generate the loop body
    main.setCurrentBasicBlock(bodyBlock);

    // Set the current loop context for nested loops
    this.currentLoopIncBlock = condBlock; // For while loops, we continue to the condition
    this.currentLoopBlock = condBlock;

    for (const stmt of node.block) {
      this.generateNode(stmt, main);
    }

    // Restore the previous loop context
    this.currentLoopIncBlock = previousLoopIncBlock;
    this.currentLoopBlock = previousLoopBlock;

    // Only add branch back to condition if the body doesn't terminate with a return or branch
    const currentBodyBlock = main.getCurrentBasicBlock();
    if (
      !currentBodyBlock.instructions.some((instr) =>
        instr.trim().startsWith("ret ") || instr.trim().startsWith("br ")
      )
    ) {
      currentBodyBlock.brInst(condBlock.label);
    }

    // Set current block to end block for continuation
    main.setCurrentBasicBlock(endBlock);

    return this.makeIrValue("0", "i32");
  }

  // Também é necessário atualizar o método generateIfStmt para funcionar corretamente dentro de loops
  private generateIfStmt(
    node: IfStatement | ElifStatement,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
    sharedContinueLabel?: LLVMBasicBlock,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    const cond = this.generateNode(node.condition as Expr, main);

    const ifLabel = main.createBasicBlock(
      "if_label" + main.nextBlockId(),
    );
    const elseLabel = main.createBasicBlock(
      "else_label" + main.nextBlockId(),
    );

    // Create continue label only if we're not in a loop and no shared label is provided
    const continueLabel = sharedContinueLabel ||
      (this.currentLoopIncBlock
        ? null // Don't create a continue label if we're in a loop
        : main.createBasicBlock("continue_label" + main.nextBlockId()));

    main.getCurrentBasicBlock().condBrInst(
      cond,
      ifLabel.label,
      elseLabel.label,
    );

    // Generate if body
    main.setCurrentBasicBlock(ifLabel);
    for (const stmt of node.primary) {
      this.generateNode(stmt, main);
    }

    // Handle if block termination
    const currentIfBlock = main.getCurrentBasicBlock();
    if (
      !currentIfBlock.instructions.some((instr) =>
        instr.trim().startsWith("ret ") ||
        instr.trim().startsWith("br ")
      )
    ) {
      if (this.currentLoopIncBlock && !sharedContinueLabel) {
        currentIfBlock.brInst(this.currentLoopIncBlock.label);
      } else if (continueLabel) {
        currentIfBlock.brInst(continueLabel.label);
      }
    }

    // Generate else body
    main.setCurrentBasicBlock(elseLabel);

    if (node.secondary !== null) {
      if (node.secondary.kind === "ElifStatement") {
        this.generateIfStmt(
          node.secondary as ElifStatement,
          elseLabel,
          main,
          continueLabel!,
        );
      } else {
        for (const stmt of node.secondary.primary) {
          this.generateNode(stmt, main);
        }

        const currentElseBlock = main.getCurrentBasicBlock();
        if (
          !currentElseBlock.instructions.some((instr) =>
            instr.trim().startsWith("ret ") ||
            instr.trim().startsWith("br ")
          )
        ) {
          if (this.currentLoopIncBlock && !sharedContinueLabel) {
            currentElseBlock.brInst(this.currentLoopIncBlock.label);
          } else if (continueLabel) {
            currentElseBlock.brInst(continueLabel.label);
          }
        }
      }
    } else {
      // Empty else case
      if (this.currentLoopIncBlock && !sharedContinueLabel) {
        elseLabel.brInst(this.currentLoopIncBlock.label);
      } else if (continueLabel) {
        elseLabel.brInst(continueLabel.label);
      }
    }

    // Only set the current basic block to continue label if it exists and we're not in a loop
    if (continueLabel && !this.currentLoopIncBlock) {
      main.setCurrentBasicBlock(continueLabel);
    }

    return this.makeIrValue("0", "i32");
  }

  private makeReturnStatement(
    node: ReturnStatement,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    const expr = this.generateNode(node.expr, main);
    main.getCurrentBasicBlock().retInst(expr);
    return expr;
  }

  private generateFnDeclaration(
    node: FunctionDeclaration,
    _entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    const scopeInstance = this.instance.scopeStack;
    this.instance.scopeStack = [node.scope!];

    const funcName = node.id.value;
    const getFunc = this.instance.availableFunctions
      .get(funcName);

    const outerVariables = new Map(this.variables);

    const params = node.args.map((arg) => ({
      name: arg.id.value,
      type: arg.llvmType!,
    }));

    const func = new LLVMFunction(funcName, node.llvmType!, params);
    const funcEntry = func.createBasicBlock("entry");
    func.setCurrentBasicBlock(funcEntry);

    for (
      const arg of getFunc?.params! as {
        name: string;
        type: TypeInfo;
        llvmType: string;
      }[]
    ) {
      const argName = arg.name;
      const argType = arg.llvmType!;

      const alloca = funcEntry.allocaInst(argType);

      funcEntry.storeInst(
        { value: `%${argName}`, type: argType },
        alloca,
      );

      this.variables.set(argName, alloca);
    }

    // TODO
    let _haveReturn = false;

    try {
      for (const stmt of node.block) {
        this.generateNode(stmt, func);
        if (stmt.kind == "ReturnStatement") {
          _haveReturn = true;
        }
      }
    } catch (error) {
      throw error;
    }

    const currentBlock = func.getCurrentBasicBlock();
    const hasTerminator = currentBlock.instructions.some(
      (instr) =>
        instr.trim().startsWith("ret ") || instr.trim().startsWith("br "),
    );

    if (!hasTerminator) {
      if (node.llvmType === "void") {
        currentBlock.retVoid();
      } else {
        currentBlock.retInst({
          value: "0",
          type: node.llvmType!,
        });
      }
    }

    this.variables = outerVariables;

    if (this.debug) {
      _entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    this.instance.scopeStack = scopeInstance;
    this.module.addFunction(func);
    return { value: "0", type: "i32" } as IRValue;
  }

  private generateCallExpr(
    node: CallExpr,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const funcName = node.callee.value;
    let funcInfo = this.instance.availableFunctions
      .get(funcName);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.loc.line_string}`,
      );
    }

    funcInfo = funcInfo as StdLibFunction;

    if (!this.declaredFuncs.has(funcName)) {
      this.declaredFuncs.add(funcName);
      if (funcInfo && (funcInfo as StdLibFunction).isStdLib != undefined) {
        this.module.addExternal(funcInfo!.ir as string);
      }
    }

    const actualFuncName = funcInfo && funcInfo.isStdLib
      ? funcInfo.name
      : funcName;

    const args: IRValue[] = [];
    const argsTypes: string[] = [];

    for (let i = 0; i < node.arguments.length; i++) {
      const arg = node.arguments[i];
      if (this.debug) {
        entry.add(
          `; DEBUG - LINE: ${arg.loc.line} | RAW: ${arg.loc.line_string}`,
        );
      }
      const argValue = this.generateNode(arg, main);

      args.push(argValue);
      argsTypes.push(argValue.type);
    }

    const returnValue = main.getCurrentBasicBlock().callInst(
      funcInfo.llvmType,
      actualFuncName as string,
      args,
      argsTypes,
    );

    if (funcInfo?.returnType.baseType === "void") {
      return this.makeIrValue("0", "i32");
    }

    return returnValue;
  }

  private generateBinaryExpr(
    expr: BinaryExpr,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    if (expr.operator === "&&" || expr.operator === "||") {
      return this.generateLogicalExprWithPhi(expr, entry, main);
    }

    const left = this.generateNode(expr.left, main);
    const right = this.generateNode(expr.right, main);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${expr.loc.line} | RAW: ${expr.loc.line_string}`,
      );
    }

    switch (expr.operator) {
      case "+":
        return entry.addInst(left, right);
      case "-":
        return entry.subInst(left, right);
      case "*":
        return entry.mulInst(left, right);
      case "**": {
        const value = left;

        if (Number(right.value) === 0) {
          return this.makeIrValue("1", "i32");
        }

        if (Number(right.value) === 1) {
          return value;
        }

        let result = left;
        for (let i = 1; i < Number(right.value); i++) {
          result = entry.mulInst(result, left);
        }

        return result;
      }
      case "/":
        return entry.divInst(left, right);
      case "==":
        return entry.icmpInst("eq", left, right);
      case "!=":
        return entry.icmpInst("ne", left, right);
      case "<":
        return entry.icmpInst("slt", left, right);
      case "<=":
        return entry.icmpInst("sle", left, right);
      case ">":
        return entry.icmpInst("sgt", left, right);
      case ">=":
        return entry.icmpInst("sge", left, right);
      case "%": {
        // i % j = j - i * ( i / j )
        // i left
        // j right
        const div = entry.divInst(left, right);
        const mul = entry.mulInst(right, div);
        return entry.subInst(left, mul);
      }
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }
  }

  private generateLogicalExprWithPhi(
    expr: BinaryExpr,
    _entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const left = this.generateNode(expr.left, main);
    const currentBlock = main.getCurrentBasicBlock();

    const leftBool = left.type === "i1"
      ? left
      : currentBlock.icmpInst("ne", left, this.makeIrValue("0", left.type));

    const rhsBlock = main.createBasicBlock(`log_rhs_${main.nextBlockId()}`);
    const endBlock = main.createBasicBlock(`log_end_${main.nextBlockId()}`);

    let shortCircuitValue: string;

    if (expr.operator === "&&") {
      shortCircuitValue = "0"; // false
      currentBlock.condBrInst(leftBool, rhsBlock.label, endBlock.label);
    } else if (expr.operator === "||") {
      shortCircuitValue = "1"; // true
      currentBlock.condBrInst(leftBool, endBlock.label, rhsBlock.label);
    } else {
      throw new Error(`Unsupported logical operator: ${expr.operator}`);
    }

    const leftBlock = currentBlock;
    main.setCurrentBasicBlock(rhsBlock);
    const right = this.generateNode(expr.right, main);

    const rightBool = right.type === "i1"
      ? right
      : rhsBlock.icmpInst("ne", right, this.makeIrValue("0", right.type));

    rhsBlock.brInst(endBlock.label);
    const rightBlock = main.getCurrentBasicBlock();

    main.setCurrentBasicBlock(endBlock);

    const phiResult = endBlock.nextTemp();
    endBlock.add(
      `${phiResult} = phi i1 [ ${shortCircuitValue}, %${leftBlock.label} ], [ ${rightBool.value}, %${rightBlock.label} ]`,
    );

    return { value: phiResult, type: "i1" };
  }

  private generateIdentifier(
    id: Identifier,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    if (!this.variables.get(id.value)) {
      throw new Error(`Unknown variable: ${id.value}`);
    }

    const variable = this.variables.get(id.value) as IRValue;

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${id.loc.line} | RAW: ${id.loc.line_string}`,
      );
    }

    return entry.loadInst({
      value: variable.value as string,
      type: variable.type as string,
    });
  }

  private generateVariableDeclaration(
    decl: VariableDeclaration,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    // console.log(
    //   "Erro!",
    //   this.instance.lookupSymbol(decl.id.value)!,
    //   decl.id.value,
    //   this.instance.lookupSymbol(decl.value.value),
    //   decl.value.value,
    // );
    const type = this.instance.lookupSymbol(decl.id.value)!.llvmType;
    const value = this.generateNode(decl.value, main);
    let variable = this.makeIrValue("0", "i32");

    if (decl.type.isArray) {
      variable = value;
    }

    if (decl.type.isStruct) {
      variable = value;
    }

    if (!decl.type.isArray && !decl.type.isStruct) {
      variable = entry.allocaInst(type);
    }

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${decl.loc.line} | RAW: ${decl.loc.line_string}`,
      );
    }

    // TODO: Improve this
    if (value.type == "i8" || value.type == "i8*") {
      if (decl.value.kind == "StringLiteral") {
        entry.storeInst(
          entry.getElementPtr(
            `[${decl.value.value.length + 1} x i8]`,
            value.value,
          ),
          variable,
        );
      } else {
        entry.storeInst(value, variable);
      }
    }

    if (!decl.type.isArray && !decl.type.isStruct) {
      entry.storeInst(
        { value: value.value, type: type as string },
        variable,
      );
    }

    this.variables.set(decl.id.value, variable);
    return variable;
  }

  private generateStringLiteral(
    str: StringLiteral,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    if (this.stringConstants.has(str.value)) {
      return this.stringConstants.get(str.value) as IRValue;
    }

    const strPtr = createStringGlobal(this.module, str.value);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${str.loc.line} | RAW: ${str.value}`,
      );
    }

    const value = entry.getElementPtr(
      `[${str.value.length + 1} x i8]`,
      strPtr,
    );
    return value;
  }

  private generateIntLiteral(
    int: IntLiteral,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${int.loc.line} | RAW: ${int.value}`,
      );
    }

    return this.makeIrValue(String(int.value), int.llvmType as string);
  }

  private generateFloatLiteral(
    float: FloatLiteral,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${float.loc.line} | RAW: ${float.value}`,
      );
    }
    const value = String(float.value).includes(".")
      ? float.value.toString()
      : `${float.value}.0`;
    return this.makeIrValue(value, "double");
  }

  private generateBinaryLiteral(
    binary: BinaryLiteral,
    _entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    const decimalValue = parseInt(binary.value.replace(/^0b/, ""), 2);
    return this.makeIrValue(String(decimalValue), "i32");
  }

  private generateNullLiteral(
    node: NullLiteral,
    entry: LLVMBasicBlock,
    _main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${node.loc.line} | RAW: ${node.value}`,
      );
    }
    return this.makeIrValue("null", "null");
  }

  private makeIrValue(value: string, type: string): IRValue {
    const value_final = String(
      new TypeChecker(this.reporter).formatLiteralForType(
        value,
        type,
      ),
    );
    return { value: value_final, type: type } as IRValue;
  }

  private getTargetTriple(): string | null {
    const command = new Deno.Command("clang", {
      args: ["-v"],
      stderr: "piped",
    });

    const output = command.outputSync();
    const stderrText = new TextDecoder().decode(output.stderr);

    const match = stderrText.match(/Target:\s+([^\s]+)/);
    return match ? match[1] : null;
  }
}
