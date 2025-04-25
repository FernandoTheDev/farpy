import {
  BinaryExpr,
  BinaryLiteral,
  CallExpr,
  Expr,
  FloatLiteral,
  FunctionDeclaration,
  Identifier,
  IntLiteral,
  LLVMType,
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

    for (const node of program.body!) {
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
      case "FunctionDeclaration":
        return this.generateFnDeclaration(node as FunctionDeclaration, entry);
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
      case "ReturnStatement":
        return this.makeReturnStatement(node as ReturnStatement, entry);
      default:
        throw new Error(
          `Unsupported node kind for IR generation: ${node.kind}`,
        );
    }
  }

  private makeReturnStatement(
    node: ReturnStatement,
    entry: LLVMBasicBlock,
  ): IRValue {
    const expr = this.generateNode(node.expr, entry);
    entry.retInst(expr);
    return expr;
  }

  private generateFnDeclaration(
    node: FunctionDeclaration,
    _entry: LLVMBasicBlock,
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

    try {
      for (const stmt of node.block) {
        this.generateNode(stmt, funcEntry);
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

    this.module.addFunction(func);
    return { value: "0", type: "i32" } as IRValue;
  }

  private generateCallExpr(node: CallExpr, entry: LLVMBasicBlock): IRValue {
    const funcName = node.callee.value;
    let funcInfo = this.instance.availableFunctions
      .get(funcName);

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

    for (const arg of node.arguments) {
      const argValue = this.generateNode(arg, entry);
      args.push(argValue);
      argsTypes.push(argValue.type);
    }

    const returnValue = entry.callInst(
      funcInfo.llvmType,
      actualFuncName as string,
      args,
      argsTypes,
    );

    // If this is a void function, handle it appropriately
    if (funcInfo?.returnType === "void") {
      // Don't use the return value
      return this.makeIrValue("0", "i32"); // Return a dummy value for IR generation
    }

    return returnValue;
  }

  private generateBinaryExpr(expr: BinaryExpr, entry: LLVMBasicBlock): IRValue {
    const left = this.generateNode(expr.left, entry);
    const right = this.generateNode(expr.right, entry);

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

        // Base case: anything to the power of 0 is 1
        if (Number(right.value) === 0) {
          return this.makeIrValue("1", "i32");
        }

        // Handle power of 1 case
        if (Number(right.value) === 1) {
          return value;
        }

        // For powers greater than 1
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
    this.variables.get(decl.id.value);
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
