import {
  BinaryExpr,
  BinaryLiteral,
  CallExpr,
  Expr,
  FloatLiteral,
  Identifier,
  IntLiteral,
  LLVMType,
  NullLiteral,
  Program,
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

export class LLVMIRGenerator {
  private static instance: LLVMIRGenerator;
  private module: LLVMModule = new LLVMModule();
  private variables: Map<string, IRValue> = new Map();
  private stringConstants: Map<string, IRValue> = new Map();
  private declaredFuncs: Set<string> = new Set();
  protected instance: Semantic = Semantic.getInstance();

  private constructor() {}

  public static getInstance(): LLVMIRGenerator {
    if (!LLVMIRGenerator.instance) {
      LLVMIRGenerator.instance = new LLVMIRGenerator();
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

    const globalDeclarations: Stmt[] = [];
    const functionsAndMain: Stmt[] = [];

    for (const node of program.body || []) {
      if (node.kind === "VariableDeclaration") {
        globalDeclarations.push(node);
      } else {
        functionsAndMain.push(node);
      }
    }

    for (const node of globalDeclarations) {
      this.generateNode(node, entry);
    }

    // Gera código para o corpo do programa
    for (const node of functionsAndMain) {
      this.generateNode(node, entry);
    }

    this.module.addFunction(mainFunc);
    entry.retInst({ value: "0", type: "i32" });
  }

  private generateNode(node: Stmt | Expr, entry: LLVMBasicBlock): IRValue {
    switch (node.kind) {
      case "BinaryExpr":
        return this.generateBinaryExpr(node as BinaryExpr, entry);
      case "Identifier":
        return this.generateIdentifier(node as Identifier, entry);
      case "VariableDeclaration":
        return this.generateVariableDeclaration(
          node as VariableDeclaration,
          entry,
        );
      case "StringLiteral":
        return this.generateStringLiteral(node as StringLiteral, entry);
      case "IntLiteral":
        return this.generateIntLiteral(node as IntLiteral, entry);
      case "FloatLiteral":
        return this.generateFloatLiteral(node as FloatLiteral, entry);
      case "BinaryLiteral":
        return this.generateBinaryLiteral(node as BinaryLiteral, entry);
      case "NullLiteral":
        return this.generateNullLiteral(node as NullLiteral, entry);
      case "CallExpr":
        return this.generateCallExpr(node as CallExpr, entry);
      case "ImportStatement":
        return this.makeIrValue("0", "i32");
      default:
        throw new Error(
          `Unsupported node kind for IR generation: ${node.kind}`,
        );
    }
  }

  private generateCallExpr(node: CallExpr, entry: LLVMBasicBlock): IRValue {
    const funcName = node.callee.value;
    const funcInfo = this.instance.availableFunctions.get(funcName);

    if (!this.declaredFuncs.has(funcName)) {
      this.declaredFuncs.add(funcName);
      if (funcInfo) this.module.addExternal(funcInfo!.ir as string);
    }

    const actualFuncName = funcInfo && funcInfo.isStdLib
      ? funcInfo.llvmName
      : funcName;

    const args: IRValue[] = [];
    const argsTypes: string[] = [];

    for (const arg of node.arguments) {
      const argValue = this.generateNode(arg, entry);
      args.push(argValue);
      argsTypes.push(argValue.type);
    }

    return entry.callInst(
      funcInfo!.returnType,
      actualFuncName,
      args,
      argsTypes,
    );
  }

  private generateBinaryExpr(expr: BinaryExpr, entry: LLVMBasicBlock): IRValue {
    const left = this.generateNode(expr.left, entry);
    const right = this.generateNode(expr.right, entry);

    switch (expr.operator) {
      case "+": {
        if (expr.llvmType === LLVMType.STRING) {
          // Strings requerem uma chamada a função de concatenação
          // TODO: Implement string concatenation
          return left;
        }

        return entry.addInst(left, right);
      }
      case "-":
        return entry.subInst(left, right);
      case "*":
        return entry.mulInst(left, right);
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

  private generateIdentifier(id: Identifier, entry: LLVMBasicBlock): IRValue {
    if (!this.variables.get(id.value)) {
      throw new Error(`Unknown variable: ${id.value}`);
    }

    const variable = this.variables.get(id.value) as IRValue;

    return entry.loadInst({
      value: variable.value as string,
      type: variable.type as string,
    });
  }

  private generateVariableDeclaration(
    decl: VariableDeclaration,
    entry: LLVMBasicBlock,
  ): IRValue {
    const variable = entry.allocaInst(decl.llvmType);
    const value = this.generateNode(decl.value, entry);

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
        { value: value.value, type: decl.llvmType as string },
        variable,
      );
    }

    this.variables.set(decl.id.value, variable);
    return variable;
  }

  private generateStringLiteral(
    str: StringLiteral,
    _entry: LLVMBasicBlock,
  ): IRValue {
    // Verificar se esta string já foi declarada
    if (this.stringConstants.has(str.value)) {
      return this.stringConstants.get(str.value) as IRValue;
    }

    const strPtr = createStringGlobal(this.module, str.value);
    const value = { value: strPtr, type: "i8*" } as IRValue;
    this.stringConstants.set(str.value, value);
    return value;
  }

  private generateIntLiteral(int: IntLiteral, _entry: LLVMBasicBlock): IRValue {
    return this.makeIrValue(String(int.value), "i32");
  }

  private generateFloatLiteral(
    float: FloatLiteral,
    _entry: LLVMBasicBlock,
  ): IRValue {
    const value = float.value.toString().includes(".")
      ? float.value.toString()
      : `${float.value}.0`;
    return this.makeIrValue(value, "double");
  }

  private generateBinaryLiteral(
    binary: BinaryLiteral,
    _entry: LLVMBasicBlock,
  ): IRValue {
    const decimalValue = parseInt(binary.value.replace(/^0b/, ""), 2);
    return this.makeIrValue(String(decimalValue), "i32");
  }

  private generateNullLiteral(
    _nullLit: NullLiteral,
    _entry: LLVMBasicBlock,
  ): IRValue {
    return this.makeIrValue("null", "null");
  }

  private makeIrValue(value: string, type: string): IRValue {
    return { value, type } as IRValue;
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
