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

  public convertValueToType(value: IRValue, targetType: string): IRValue {
    const sourceType = value.type;

    // Early return if types are already the same
    if (sourceType === targetType) return value;

    try {
      // Check if both types are pointers
      const isSourcePointer = sourceType.includes("*");
      const isTargetPointer = targetType.includes("*");
      const isSourceInt = this.isInteger(sourceType);
      const isTargetInt = this.isInteger(targetType);
      const isSourceFloat = this.isFloat(sourceType);
      const isTargetFloat = this.isFloat(targetType);

      // Handle pointer to pointer conversion using bitcast
      if (isSourcePointer && isTargetPointer) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = bitcast ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(
          `Converting pointer type ${sourceType} to ${targetType} using bitcast`,
        );
        return { value: tmp, type: targetType };
      }

      // Integer to pointer conversion
      if (isSourceInt && isTargetPointer) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = inttoptr ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(
          `Converting integer type ${sourceType} to pointer type ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // Pointer to integer conversion
      if (isSourcePointer && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = ptrtoint ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(
          `Converting pointer type ${sourceType} to integer type ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // NEW CASE: Pointer to float conversion (need to go through integer first)
      if (isSourcePointer && isTargetFloat) {
        // First convert pointer to integer (using i64 for safety with pointers)
        const intTmp = this.nextTemp();
        this.add(`${intTmp} = ptrtoint ${sourceType} ${value.value} to i64`);

        // Then convert integer to float
        const floatTmp = this.nextTemp();
        this.add(`${floatTmp} = sitofp i64 ${intTmp} to ${targetType}`);
        console.log(
          `Converting pointer type ${sourceType} to float type ${targetType} via i64`,
        );
        return { value: floatTmp, type: targetType };
      }

      // NEW CASE: Float to pointer conversion (need to go through integer first)
      if (isSourceFloat && isTargetPointer) {
        // First convert float to integer
        const intTmp = this.nextTemp();
        this.add(`${intTmp} = fptosi ${sourceType} ${value.value} to i64`);

        // Then convert integer to pointer
        const ptrTmp = this.nextTemp();
        this.add(`${ptrTmp} = inttoptr i64 ${intTmp} to ${targetType}`);
        console.log(
          `Converting float type ${sourceType} to pointer type ${targetType} via i64`,
        );
        return { value: ptrTmp, type: targetType };
      }

      // Integer type conversions
      if (isSourceInt && isTargetInt) {
        const sourceRank = this.getIntRank(sourceType);
        const targetRank = this.getIntRank(targetType);

        const tmp = this.nextTemp();
        let instr;

        if (sourceRank < targetRank) {
          instr = `sext ${sourceType} ${value.value} to ${targetType}`;
        } else {
          instr = `trunc ${sourceType} ${value.value} to ${targetType}`;
        }

        this.add(`${tmp} = ${instr}`);
        return { value: tmp, type: targetType };
      }

      // Float type conversions
      if (isSourceFloat && isTargetFloat) {
        const sourceRank = this.getFloatRank(sourceType);
        const targetRank = this.getFloatRank(targetType);

        const tmp = this.nextTemp();
        let instr;

        if (sourceRank < targetRank) {
          instr = `fpext ${sourceType} ${value.value} to ${targetType}`;
        } else {
          instr = `fptrunc ${sourceType} ${value.value} to ${targetType}`;
        }

        this.add(`${tmp} = ${instr}`);
        return { value: tmp, type: targetType };
      }

      // Integer to float conversion
      if (isSourceInt && isTargetFloat) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = sitofp ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(
          `${tmp} = sitofp ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(`Converting type ${sourceType} to ${targetType}`);
        return { value: tmp, type: targetType };
      }

      // Float to integer conversion
      if (isSourceFloat && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = fptosi ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(
          `${tmp} = fptosi ${sourceType} ${value.value} to ${targetType}`,
        );
        console.log(`Converting type ${sourceType} to ${targetType}`);
        return { value: tmp, type: targetType };
      }

      // Binary to integer conversion (assuming binary is a custom type for boolean values)
      if (sourceType === "binary" && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(`${tmp} = zext ${sourceType} ${value.value} to ${targetType}`);
        return { value: tmp, type: targetType };
      }

      // If no conversion path was found
      console.log("ERROR");
      throw new Error(
        `Unsupported type conversion from ${sourceType} to ${targetType}`,
      );
    } catch (error: any) {
      console.error(`Error during type conversion: ${error.message}`);
      throw error;
    }
  }

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

  public getAlign(type: string): number {
    // Remove pointer asterisks to get the base type
    const baseType = type.replace(/\*/g, "");

    // Handle primitive types
    switch (baseType) {
      case "i1":
      case "i8":
        return 1;
      case "i16":
        return 2;
      case "i32":
      case "float":
        return 4;
      case "i64":
      case "double":
        return 8;
      case "i128":
        return 16;
      case "binary": // Custom type for boolean if you're using it
        return 1;
      default:
        // For struct types or user-defined types, we would need more information
        // For now, default to 8 bytes (pointer size on 64-bit systems)
        if (baseType.startsWith("%") || baseType.startsWith("@")) {
          return 8;
        }

        // For array types, parse dimensions and calculate alignment
        if (baseType.includes("[") && baseType.includes("x")) {
          // Extract the element type (e.g., for [4 x i32], get i32)
          const elementType = baseType.substring(baseType.lastIndexOf("x") + 1)
            .trim();
          return this.getAlign(elementType);
        }

        console.warn(`Unknown type for alignment: ${type}, defaulting to 8`);
        return 8;
    }
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
    this.add(`${tmp} = alloca ${varType}, align ${this.getAlign(varType)}`);
    return { value: tmp, type: `${varType}*` };
  }

  public loadInst(ptr: IRValue): IRValue {
    if (!ptr.type.endsWith("*")) {
      throw new Error(`Erro: Tentativa de load em não-ponteiro (${ptr.type})`);
    }
    const base = ptr.type.slice(0, -1);
    const tmp = this.nextTemp();
    this.add(
      `${tmp} = load ${base}, ${base}* ${ptr.value}, align ${
        this.getAlign(base)
      }`,
    );
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
      `store ${value.type} ${value.value}, ${value.type}* ${ptr.value}, align ${
        this.getAlign(base)
      }`,
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
