import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import {
  BinaryExpr,
  BinaryLiteral,
  CallExpr,
  ElifStatement,
  Expr,
  FloatLiteral,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IntLiteral,
  NullLiteral,
  Program,
  ReturnStatement,
  Stmt,
  StringLiteral,
  VariableDeclaration,
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
  private static instance: LLVMIRGenerator;
  private module: LLVMModule = new LLVMModule();
  private variables: Map<string, IRValue> = new Map();
  private stringConstants: Map<string, IRValue> = new Map();
  private declaredFuncs: Set<string> = new Set();
  private readonly reporter: DiagnosticReporter;
  private readonly debug: boolean;
  protected instance: Semantic;

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
    _entry?: LLVMBasicBlock | null,
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
      // TODO
      // case "AssignmentDeclaration":
      //   return this.generateAssignment(node as AssignmentDeclaration, entry);
      case "FunctionDeclaration":
        return this.generateFnDeclaration(
          node as FunctionDeclaration,
          entry,
          main,
        );
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
      case "CallExpr":
        return this.generateCallExpr(node as CallExpr, entry, main);
      case "ImportStatement":
        return this.makeIrValue("0", "i32");
      case "ReturnStatement":
        return this.makeReturnStatement(node as ReturnStatement, entry, main);
      default:
        throw new Error(
          `Unsupported node kind for IR generation: ${node.kind}`,
        );
    }
  }

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

    const continueLabel = sharedContinueLabel ||
      main.createBasicBlock(
        "continue_label" +
          main.nextBlockId(),
      );

    entry.condBrInst(cond, ifLabel.label, elseLabel.label);

    main.setCurrentBasicBlock(ifLabel);
    for (const stmt of node.primary) {
      this.generateNode(stmt, main);
    }

    if (
      !ifLabel.instructions.some((instr) =>
        instr.trim().startsWith("ret ") ||
        instr.trim().startsWith("br ")
      )
    ) {
      ifLabel.brInst(continueLabel.label);
    }

    main.setCurrentBasicBlock(elseLabel);

    if (node.secondary !== null) {
      if (node.secondary.kind === "ElifStatement") {
        this.generateIfStmt(
          node.secondary as ElifStatement,
          elseLabel,
          main,
          continueLabel,
        );
      } else {
        for (const stmt of node.secondary.primary) {
          this.generateNode(stmt, main);
        }

        if (
          !elseLabel.instructions.some((instr) =>
            instr.trim().startsWith("ret ") ||
            instr.trim().startsWith("br ")
          )
        ) {
          elseLabel.brInst(continueLabel.label);
        }
      }
    } else {
      elseLabel.brInst(continueLabel.label);
    }

    if (!sharedContinueLabel) {
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
    entry.retInst(expr);
    return expr;
  }

  private generateFnDeclaration(
    node: FunctionDeclaration,
    _entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
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

    for (
      const arg of getFunc?.params! as {
        name: string;
        type: string;
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

    let haveReturn = false;
    // main.setCurrentBasicBlock(funcEntry);

    try {
      for (const stmt of node.block) {
        console.log("FUNC", stmt.kind);
        this.generateNode(stmt, func, funcEntry);
        if (stmt.kind == "ReturnStatement") {
          haveReturn = true;
          break;
        }
      }
    } catch (error) {
      throw error;
    }

    if (!haveReturn) {
      if (node.llvmType === "void") {
        funcEntry.retVoid();
      } else {
        funcEntry.retInst({
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

    this.module.addFunction(func);
    // main.setCurrentBasicBlock(_entry);
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
    // const typeChecker = new TypeChecker(this.reporter);

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

    const returnValue = entry.callInst(
      funcInfo.llvmType,
      actualFuncName as string,
      args,
      argsTypes,
    );

    if (funcInfo?.returnType === "void") {
      return this.makeIrValue("0", "i32");
    }

    return returnValue;
  }

  private generateBinaryExpr(
    expr: BinaryExpr,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    let left = this.generateNode(expr.left, main);
    let right = this.generateNode(expr.right, main);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${expr.loc.line} | RAW: ${expr.loc.line_string}`,
      );
    }

    if (left.value[0] == "%") {
      // If the left value is a variable, load it
      // left = entry.loadInst(entry.toPtr(left));
    }

    if (right.value[0] == "%") {
      // If the right value is a variable, load it
      // right = entry.loadInst(entry.toPtr(right));
    }

    switch (expr.operator) {
      case "+": {
        if (left.type.includes("i8") || right.type.includes("i8")) {
          if (!this.declaredFuncs.has("string_concat")) {
            this.declaredFuncs.add("string_concat");
            // Declare string concatenation function in the module
            this.module.addExternal(
              "declare i8* @string_concat(i8*, i8*)",
            );
          }

          // Call the string concatenation function
          return entry.callInst(
            "i8*",
            "string_concat",
            [left, right],
            [left.type, right.type],
          );
        }

        return entry.addInst(left, right);
      }
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
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }
  }

  private generateIdentifier(
    id: Identifier,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
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
    const type = this.instance.lookupSymbol(decl.id.value)!.llvmType;
    const variable = entry.allocaInst(type);
    const value = this.generateNode(decl.value, main);

    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${decl.loc.line} | RAW: ${decl.loc.line_string}`,
      );
    }

    if (value.type == "i8" || value.type == "i8*") {
      entry.storeInst(
        entry.getElementPtr(
          `[${decl.value.value.length + 1} x i8]`,
          value.value,
        ),
        variable,
      );
    } else {
      entry.storeInst(
        { value: value.value, type: type as string },
        variable,
      );
    }

    this.variables.set(decl.id.value, variable);
    this.variables.get(decl.id.value);
    return variable;
  }

  private generateStringLiteral(
    str: StringLiteral,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
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
    this.stringConstants.set(str.value, value);
    return value;
  }

  private generateIntLiteral(
    int: IntLiteral,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
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
    main: LLVMFunction,
  ): IRValue {
    if (this.debug) {
      entry.add(
        `; DEBUG - LINE: ${float.loc.line} | RAW: ${float.value}`,
      );
    }
    const value = float.value.toString().includes(".")
      ? float.value.toString()
      : `${float.value}.0`;
    return this.makeIrValue(value, "double");
  }

  private generateBinaryLiteral(
    binary: BinaryLiteral,
    _entry: LLVMBasicBlock,
    main: LLVMFunction,
  ): IRValue {
    const decimalValue = parseInt(binary.value.replace(/^0b/, ""), 2);
    return this.makeIrValue(String(decimalValue), "i32");
  }

  private generateNullLiteral(
    node: NullLiteral,
    entry: LLVMBasicBlock,
    main: LLVMFunction,
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
