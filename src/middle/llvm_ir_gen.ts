import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import {
  AssignmentDeclaration,
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
import { TypesNative } from "../frontend/values.ts";
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
  protected instance: Semantic;

  private constructor(reporter: DiagnosticReporter) {
    this.reporter = reporter;
    this.instance = Semantic.getInstance(this.reporter);
  }

  public static getInstance(reporter: DiagnosticReporter): LLVMIRGenerator {
    if (!LLVMIRGenerator.instance) {
      LLVMIRGenerator.instance = new LLVMIRGenerator(reporter);
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
      // TODO
      // case "AssignmentDeclaration":
      //   return this.generateAssignment(node as AssignmentDeclaration, entry);
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

  // TODO
  // private generateAssignment(
  //   node: AssignmentDeclaration,
  //   entry: LLVMBasicBlock,
  // ): IRValue {
  //   const variable = this.variables.get(node.id.value);
  //   console.log("Variable:", variable);

  //   if (!variable) {
  //     this.reporter.addError(
  //       node.id.loc,
  //       `Unknown variable: ${node.id.value}`,
  //     );
  //     throw new Error(`Unknown variable: ${node.id.value}`);
  //   }

  //   const value = this.generateNode(node.value, entry);
  //   console.log("Storing value:", value);

  //   const variableBaseType = variable.type.replace("*", "");

  //   if (value.type !== variableBaseType) {
  //     const typeChecker = new TypeChecker(this.reporter);

  //     if (typeChecker.areTypesCompatible(value.type, variableBaseType)) {
  //       const convertedValue = entry.convertValueToType(
  //         value,
  //         variableBaseType,
  //       );
  //       console.log(
  //         `Converting value from ${value.type} to ${variableBaseType}`,
  //       );

  //       entry.storeInst(convertedValue, variable);
  //     } else {
  //       this.reporter.addError(
  //         node.value.loc,
  //         `Cannot assign value of type '${value.type}' to variable '${node.id.value}' of type '${variableBaseType}'`,
  //       );
  //       throw new Error(`Incompatible type assignment to ${node.id.value}`);
  //     }
  //   } else {
  //     entry.storeInst(value, variable);
  //   }

  //   return variable;
  // }

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
    // const typeChecker = new TypeChecker(this.reporter);

    for (let i = 0; i < node.arguments.length; i++) {
      const arg = node.arguments[i];
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

    if (funcInfo?.returnType === "void") {
      return this.makeIrValue("0", "i32");
    }

    return returnValue;
  }

  private generateBinaryExpr(expr: BinaryExpr, entry: LLVMBasicBlock): IRValue {
    let left = this.generateNode(expr.left, entry);
    let right = this.generateNode(expr.right, entry);

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
    const type = this.instance.lookupSymbol(decl.id.value)!.llvmType;
    const variable = entry.allocaInst(type);
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
    _entry: LLVMBasicBlock,
  ): IRValue {
    // Verificar se esta string já foi declarada
    if (this.stringConstants.has(str.value)) {
      return this.stringConstants.get(str.value) as IRValue;
    }

    const strPtr = createStringGlobal(this.module, str.value);
    const value = _entry.getElementPtr(
      `[${str.value.length + 1} x i8]`,
      strPtr,
    );
    this.stringConstants.set(str.value, value);
    return value;
  }

  private generateIntLiteral(int: IntLiteral, _entry: LLVMBasicBlock): IRValue {
    return this.makeIrValue(String(int.value), int.llvmType as string);
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
