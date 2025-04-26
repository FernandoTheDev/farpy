import { TempCounter } from "./TempCounter.ts";
import { IRValue } from "../types/IRTypes.ts";

export class LLVMBasicBlock {
  public instructions: string[] = [];

  constructor(public label: string, private tempCounter: TempCounter) {}

  public add(instruction: string): void {
    this.instructions.push(`  ${instruction}`);
  }

  public nextTemp(): string {
    return this.tempCounter.next();
  }

  // Helpers para classificação de tipos
  private isInteger(type: string): boolean {
    return /^i\d+$/.test(type);
  }

  private isFloat(type: string): boolean {
    return type === "float" || type === "double";
  }

  private getIntRank(type: string): number {
    const bits = parseInt(type.slice(1), 10);
    return isNaN(bits) ? 0 : bits;
  }

  private getFloatRank(type: string): number {
    return type === "float" ? 32 : type === "double" ? 64 : 0;
  }

  /**
   * Conversor de tipos:
   * - Se ambos inteiros: zext/trunc
   * - Se ambos floats: fpext/fptrunc
   * - Se misto: sitofp (int->fp)
   */
  public convertOperands(
    op1: IRValue,
    op2: IRValue,
  ): { op1: IRValue; op2: IRValue; commonType: string } {
    const int1 = this.isInteger(op1.type);
    const int2 = this.isInteger(op2.type);
    const f1 = this.isFloat(op1.type);
    const f2 = this.isFloat(op2.type);

    // Ambos inteiros
    if (int1 && int2) {
      const r1 = this.getIntRank(op1.type);
      const r2 = this.getIntRank(op2.type);
      if (r1 === r2) return { op1, op2, commonType: op1.type };
      const maiorType = r1 > r2 ? op1.type : op2.type;
      const menorOp = r1 > r2 ? op2 : op1;
      const maiorOp = r1 > r2 ? op1 : op2;
      const tmp = this.nextTemp();
      const instr = r1 < r2
        ? `zext ${menorOp.type} ${menorOp.value} to ${maiorType}`
        : `trunc ${menorOp.type} ${menorOp.value} to ${maiorType}`;
      this.add(`${tmp} = ${instr}`);
      return r1 > r2
        ? {
          op1: maiorOp,
          op2: { value: tmp, type: maiorType },
          commonType: maiorType,
        }
        : {
          op1: { value: tmp, type: maiorType },
          op2: maiorOp,
          commonType: maiorType,
        };
    }

    // Ambos floats
    if (f1 && f2) {
      const r1 = this.getFloatRank(op1.type);
      const r2 = this.getFloatRank(op2.type);
      if (r1 === r2) return { op1, op2, commonType: op1.type };
      const maiorType = r1 > r2 ? op1.type : op2.type;
      const menorOp = r1 > r2 ? op2 : op1;
      const maiorOp = r1 > r2 ? op1 : op2;
      const tmp = this.nextTemp();
      const instr = r1 < r2
        ? `fpext ${menorOp.type} ${menorOp.value} to ${maiorType}`
        : `fptrunc ${menorOp.type} ${menorOp.value} to ${maiorType}`;
      this.add(`${tmp} = ${instr}`);
      return r1 > r2
        ? {
          op1: maiorOp,
          op2: { value: tmp, type: maiorType },
          commonType: maiorType,
        }
        : {
          op1: { value: tmp, type: maiorType },
          op2: maiorOp,
          commonType: maiorType,
        };
    }

    // Misto int e float
    if ((int1 && f2) || (f1 && int2)) {
      const floatOp = f1 ? op1 : op2;
      const intOp = int1 ? op1 : op2;
      const targetType = floatOp.type;
      const tmp = this.nextTemp();
      this.add(
        `${tmp} = sitofp ${intOp.type} ${intOp.value} to ${targetType}`,
      );
      if (f1) {
        return {
          op1: floatOp,
          op2: { value: tmp, type: targetType },
          commonType: targetType,
        };
      } else {
        return {
          op1: { value: tmp, type: targetType },
          op2: floatOp,
          commonType: targetType,
        };
      }
    }

    // Fallback
    return { op1, op2, commonType: op1.type };
  }

  // Operações aritméticas utilizando conversor
  public addInst(op1: IRValue, op2: IRValue): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(op1, op2);
    const tmp = this.nextTemp();
    const instr = this.isFloat(commonType) ? "fadd" : "add";
    this.add(`${tmp} = ${instr} ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public subInst(op1: IRValue, op2: IRValue): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(op1, op2);
    const tmp = this.nextTemp();
    const instr = this.isFloat(commonType) ? "fsub" : "sub";
    this.add(`${tmp} = ${instr} ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public mulInst(op1: IRValue, op2: IRValue): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(op1, op2);
    const tmp = this.nextTemp();
    const instr = this.isFloat(commonType) ? "fmul" : "mul";
    this.add(`${tmp} = ${instr} ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public divInst(op1: IRValue, op2: IRValue): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(op1, op2);
    const tmp = this.nextTemp();
    const instr = this.isFloat(commonType) ? "fdiv" : "div";
    this.add(`${tmp} = ${instr} ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public retInst(value: IRValue): void {
    this.add(`ret ${value.type} ${value.value}`);
  }

  public retVoid(): void {
    this.add(`ret void`);
  }

  // Memory e ponteiros
  public allocaInst(varType: string = "i32"): IRValue {
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${varType}, align 4`);
    return { value: tmp, type: `${varType}*` };
  }

  public loadInst(ptr: IRValue): IRValue {
    if (!ptr.type.endsWith("*")) {
      throw new Error(`Erro: Tentativa de load em não-ponteiro (${ptr.type})`);
    }
    const base = ptr.type.slice(0, -1);
    const tmp = this.nextTemp();
    this.add(`${tmp} = load ${base}, ${base}* ${ptr.value}, align 4`);
    return { value: tmp, type: base };
  }

  public storeInst(value: IRValue, ptr: IRValue): void {
    if (!ptr.type.endsWith("*")) {
      throw new Error(`Erro store: alvo não é ponteiro`);
    }
    const base = ptr.type.slice(0, -1);
    if (value.type !== base) {
      throw new Error(`Erro store: tipos ${value.type} != ${base}`);
    }
    this.add(
      `store ${value.type} ${value.value}, ${value.type}* ${ptr.value}, align 4`,
    );
  }

  public getElementPtr(arrayType: string, globalLabel: string): IRValue {
    const baseType = arrayType.match(/\[\d+ x (.+)\]/)?.[1] || arrayType;
    const tmp = this.nextTemp();
    this.add(
      `${tmp} = getelementptr inbounds ${arrayType}, ${arrayType}* ${globalLabel}, i32 0, i32 0`,
    );
    return { value: tmp, type: `${baseType}*` };
  }

  // Métodos inteligentes de ponteiro
  public isPointer(val: IRValue): boolean {
    return val.type.endsWith("*");
  }

  public smartLoad(val: IRValue): IRValue {
    return this.isPointer(val) ? this.loadInst(val) : val;
  }

  public smartAdd(op1: IRValue, op2: IRValue): IRValue {
    const p1 = this.isPointer(op1);
    const p2 = this.isPointer(op2);
    if (p1 && !p2) {
      const base = op1.type.slice(0, -1);
      const tmp = this.nextTemp();
      this.add(
        `${tmp} = getelementptr inbounds ${base}, ${base}* ${op1.value}, i32 ${op2.value}`,
      );
      return { value: tmp, type: op1.type };
    }
    if (!p1 && !p2) {
      return this.addInst(op1, op2);
    }
    throw new Error("Erro smartAdd: operação inválida");
  }

  public toPtr(val: IRValue): IRValue {
    if (this.isPointer(val)) return val;
    const ptr = this.allocaInst(val.type);
    console.log("toPtr", val, ptr);
    this.storeInst(val, ptr);
    return ptr;
  }

  public callInst(
    retType: string,
    funcName: string,
    args: IRValue[],
    argTypes: string[],
  ): IRValue {
    const tmp = this.nextTemp();
    const argsStr = args.map((a, i) => `${argTypes[i]} ${a.value}`).join(", ");
    if (retType != "void") {
      this.add(`${tmp} = call ${retType} @${funcName}(${argsStr})`);
    } else {
      this.add(`call ${retType} @${funcName}(${argsStr})`);
    }
    return { value: tmp, type: retType };
  }

  public icmpInst(
    cond:
      | "eq"
      | "ne"
      | "ugt"
      | "uge"
      | "ult"
      | "ule"
      | "sgt"
      | "sge"
      | "slt"
      | "sle",
    op1: IRValue,
    op2: IRValue,
  ): IRValue {
    if (op1.type !== op2.type) {
      throw new Error(
        `Erro icmp: tipos incompatíveis ${op1.type} vs ${op2.type}`,
      );
    }
    const tmp = this.nextTemp();
    this.add(`${tmp} = icmp ${cond} ${op1.type} ${op1.value}, ${op2.value}`);
    return { value: tmp, type: "i1" };
  }

  public condBrInst(
    condition: IRValue,
    trueLabel: string,
    falseLabel: string,
  ): void {
    if (condition.type !== "i1") {
      throw new Error(`Erro condBr: tipo ${condition.type}`);
    }
    this.add(
      `br i1 ${condition.value}, label %${trueLabel}, label %${falseLabel}`,
    );
  }

  public brInst(label: string): void {
    this.add(`br label %${label}`);
  }

  public toString(): string {
    return `${this.label}:\n${this.instructions.join("\n")}`;
  }
}
