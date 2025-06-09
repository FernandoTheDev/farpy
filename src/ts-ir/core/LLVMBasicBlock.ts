/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { IRValue } from "../types/IRTypes.ts";
import { LLVMFunction } from "./LLVMFunction.ts";

export class LLVMBasicBlock {
  public instructions: string[] = [];

  constructor(public label: string, private tempCounter: LLVMFunction) {}

  public add(instruction: string): void {
    this.instructions.push(`  ${instruction}`);
  }

  public nextTemp(): string {
    return this.tempCounter.nextTemp();
  }

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

    if (sourceType === targetType) return value;

    try {
      const isSourcePointer = sourceType.includes("*") || sourceType == "ptr";
      const isTargetPointer = targetType.includes("*");
      const isSourceInt = this.isInteger(sourceType);
      const isTargetInt = this.isInteger(targetType);
      const isSourceFloat = this.isFloat(sourceType);
      const isTargetFloat = this.isFloat(targetType);
      const isSourceBool = sourceType === "i1" || sourceType === "binary" ||
        sourceType === "bool";
      const isTargetBool = targetType === "i1" || targetType === "binary" ||
        targetType === "bool";

      // Handle pointer to pointer conversion using bitcast
      if (isSourcePointer && isTargetPointer) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = bitcast ${sourceType} ${value.value} to ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // Integer to pointer conversion
      if (isSourceInt && isTargetPointer) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = inttoptr ${sourceType} ${value.value} to ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // Pointer to integer conversion
      if (isSourcePointer && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = ptrtoint ${sourceType} ${value.value} to ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // Pointer to float conversion (need to go through integer first)
      if (isSourcePointer && isTargetFloat) {
        // First convert pointer to integer (using i64 for safety with pointers)
        const intTmp = this.nextTemp();
        this.add(`${intTmp} = ptrtoint ${sourceType} ${value.value} to i64`);

        // Then convert integer to float
        const floatTmp = this.nextTemp();
        this.add(`${floatTmp} = sitofp i64 ${intTmp} to ${targetType}`);
        return { value: floatTmp, type: targetType };
      }

      // Float to pointer conversion (need to go through integer first)
      if (isSourceFloat && isTargetPointer) {
        // First convert float to integer
        const intTmp = this.nextTemp();
        this.add(`${intTmp} = fptosi ${sourceType} ${value.value} to i64`);

        // Then convert integer to pointer
        const ptrTmp = this.nextTemp();
        this.add(`${ptrTmp} = inttoptr i64 ${intTmp} to ${targetType}`);
        return { value: ptrTmp, type: targetType };
      }

      // Boolean to integer conversion
      if (isSourceBool && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(`${tmp} = zext i1 ${value.value} to ${targetType}`);
        return { value: tmp, type: targetType };
      }

      // Integer to boolean conversion
      if (isSourceInt && isTargetBool) {
        const tmp = this.nextTemp();
        // Convert by comparing with zero (non-zero = true, zero = false)
        this.add(`${tmp} = icmp ne ${sourceType} ${value.value}, 0`);
        return { value: tmp, type: "i1" };
      }

      // Boolean to float conversion
      if (isSourceBool && isTargetFloat) {
        // First convert bool to integer (i32)
        const intTmp = this.nextTemp();
        this.add(`${intTmp} = zext i1 ${value.value} to i32`);

        // Then convert integer to float
        const floatTmp = this.nextTemp();
        this.add(`${floatTmp} = sitofp i32 ${intTmp} to ${targetType}`);
        return { value: floatTmp, type: targetType };
      }

      // Float to boolean conversion
      if (isSourceFloat && isTargetBool) {
        const tmp = this.nextTemp();
        // Convert by comparing with zero (non-zero = true, zero = false)
        this.add(`${tmp} = fcmp une ${sourceType} ${value.value}, 0.0`);
        return { value: tmp, type: "i1" };
      }

      // Integer type conversions
      if (isSourceInt && isTargetInt) {
        const sourceRank = this.getIntRank(sourceType);
        const targetRank = this.getIntRank(targetType);

        const tmp = this.nextTemp();
        let instr;

        // Fixed: Use correct extension/truncation based on bit sizes
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
        return { value: tmp, type: targetType };
      }

      // Float to integer conversion
      if (isSourceFloat && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(
          `${tmp} = fptosi ${sourceType} ${value.value} to ${targetType}`,
        );
        return { value: tmp, type: targetType };
      }

      // Binary to integer conversion (assuming binary is a custom type for boolean values)
      if (sourceType === "binary" && isTargetInt) {
        const tmp = this.nextTemp();
        this.add(`${tmp} = zext ${sourceType} ${value.value} to ${targetType}`);
        return { value: tmp, type: targetType };
      }

      // If no conversion path was found
      console.log(
        "ERROR",
        `Unsupported type conversion from ${sourceType} to ${targetType}`,
      );
      throw new Error(
        `Unsupported type conversion from ${sourceType} to ${targetType}`,
      );
    } catch (error: unknown) {
      console.error(`Error during type conversion: ${error}`);
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

    // Both inteiros
    if (int1 && int2) {
      const r1 = this.getIntRank(op1.type);
      const r2 = this.getIntRank(op2.type);
      if (r1 === r2) return { op1, op2, commonType: op1.type };
      const maiorType = r1 > r2 ? op1.type : op2.type;
      const menorOp = r1 > r2 ? op2 : op1;
      const maiorOp = r1 > r2 ? op1 : op2;
      const tmp = this.nextTemp();
      // Fixed: If we're converting from smaller to larger int, use sext not zext
      // And make sure we're using the correct conversion direction
      const instr = r1 > r2
        ? `sext ${menorOp.type} ${menorOp.value} to ${maiorType}`
        : `sext ${menorOp.type} ${menorOp.value} to ${maiorType}`;
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

    // Both floats
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
      case "ptr":
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
          const elementType = baseType.substring(
            baseType.lastIndexOf("x") + 2,
          )
            .trim().replace("]", "");
          return this.getAlign(elementType);
        }

        console.warn(`Unknown type for alignment: ${type}, defaulting to 8`);
        return 8;
    }
  }

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
    const instr = this.isFloat(commonType) ? "fdiv" : "sdiv";
    this.add(`${tmp} = ${instr} ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public retInst(value: IRValue): void {
    this.add(`ret ${value.type} ${value.value}`);
  }

  public retVoid(): void {
    this.add(`ret void`);
  }

  public allocaInst(varType: string = "i32"): IRValue {
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${varType}, align ${this.getAlign(varType)}`);
    return {
      value: tmp,
      type: varType == "ptr" ? `${varType}` : `${varType}*`,
    };
  }

  public loadInst(ptr: IRValue): IRValue {
    if (!ptr.type.endsWith("*") && ptr.type != "ptr") {
      throw new Error(`Erro: Tentativa de load em não-ponteiro (${ptr.type})`);
    }
    const base = ptr.type != "ptr" ? ptr.type.slice(0, -1) : ptr.type;
    const ptrTypeInInst = ptr.type == "ptr" ? "ptr" : `${base}*`;
    const tmp = this.nextTemp();

    this.add(
      `${tmp} = load ${base}, ${ptrTypeInInst} ${ptr.value}, align ${
        this.getAlign(base)
      }`,
    );
    return { value: tmp, type: base };
  }

  public storeInst(value: IRValue, ptr: IRValue): void {
    if (!ptr.type.endsWith("*") && ptr.type != "ptr") {
      throw new Error(`Erro store: alvo não é ponteiro`);
    }
    const base = ptr.type != "ptr" ? ptr.type.slice(0, -1) : ptr.type;
    const ptrTypeInInst = ptr.type == "ptr" ? "ptr" : `${base}*`;

    if (value.type !== base) {
      throw new Error(`Erro store: tipos ${value.type} != ${base}`);
    }
    this.add(
      `store ${value.type} ${value.value}, ${ptrTypeInInst} ${ptr.value}, align ${
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

  public fnegInst(operand: IRValue): IRValue {
    if (!this.isFloat(operand.type)) {
      throw new Error(
        `Erro fneg: tipo não é ponto flutuante (${operand.type})`,
      );
    }
    const tmp = this.nextTemp();
    this.add(`${tmp} = fneg ${operand.type} ${operand.value}`);
    return { value: tmp, type: operand.type };
  }

  public xorInst(left: IRValue, right: IRValue): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(
      left,
      right,
    );
    if (!this.isInteger(commonType)) {
      throw new Error(`Erro xor: tipo não é inteiro (${commonType})`);
    }
    const tmp = this.nextTemp();
    this.add(`${tmp} = xor ${commonType} ${lhs.value}, ${rhs.value}`);
    return { value: tmp, type: commonType };
  }

  public fcmpInst(
    predicate:
      | "oeq"
      | "ogt"
      | "oge"
      | "olt"
      | "ole"
      | "one"
      | "ord"
      | "ueq"
      | "ugt"
      | "uge"
      | "ult"
      | "ule"
      | "une"
      | "uno"
      | "true"
      | "false",
    left: IRValue,
    right: IRValue,
  ): IRValue {
    const { op1: lhs, op2: rhs, commonType } = this.convertOperands(
      left,
      right,
    );
    if (!this.isFloat(commonType)) {
      throw new Error(`Erro fcmp: tipo não é ponto flutuante (${commonType})`);
    }
    const tmp = this.nextTemp();
    this.add(
      `${tmp} = fcmp ${predicate} ${commonType} ${lhs.value}, ${rhs.value}`,
    );
    return { value: tmp, type: "i1" };
  }

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
    // console.log(`${tmp} = icmp ${cond} ${op1.type} ${op1.value}, ${op2.value}`);
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

  public allocaArrayInst(elementType: string, size: number): IRValue {
    const arrayType = `[${size} x ${elementType}]`;
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }

  public createGlobalArray(
    name: string,
    elementType: string,
    size: number,
    initialValues?: string[],
  ): string {
    const arrayType = `[${size} x ${elementType}]`;

    if (initialValues && initialValues.length > 0) {
      const initStr = initialValues
        .map((val) => `${elementType} ${val}`)
        .join(", ");
      return `@.arr${name} = global ${arrayType} [${initStr}]`;
    } else {
      return `@.arr${name} = global ${arrayType} zeroinitializer`;
    }
  }

  public getStringElementPtr(stringPtr: IRValue, index: IRValue): IRValue {
    if (!stringPtr.type.endsWith("*")) {
      throw new Error(
        `getStringElementPtr requires a pointer to a string (i8*), got ${stringPtr.type}`,
      );
    }

    let indexValue = index;
    if (index.type !== "i32") {
      indexValue = this.convertValueToType(index, "i32");
    }

    const tmp = this.nextTemp();

    this.add(
      `${tmp} = getelementptr inbounds i8, ${stringPtr.type} ${stringPtr.value}, i32 ${indexValue.value}`,
    );

    const charTmp = this.nextTemp();
    this.add(`${charTmp} = load i8, i8* ${tmp}, align 1`);

    const resultPtr = this.nextTemp();
    this.add(`${resultPtr} = alloca [2 x i8], align 1`);

    const firstCharPtr = this.nextTemp();
    this.add(
      `${firstCharPtr} = getelementptr inbounds [2 x i8], [2 x i8]* ${resultPtr}, i32 0, i32 0`,
    );

    this.add(`store i8 ${charTmp}, i8* ${firstCharPtr}, align 1`);

    const nullTermPtr = this.nextTemp();
    this.add(
      `${nullTermPtr} = getelementptr inbounds i8, i8* ${firstCharPtr}, i32 1`,
    );
    this.add(`store i8 0, i8* ${nullTermPtr}, align 1`);

    return { value: firstCharPtr, type: "i8*" };
  }

  public getArrayElementPtr(arrayPtr: IRValue, index: IRValue): IRValue {
    if (!arrayPtr.type.endsWith("*")) {
      throw new Error(
        `getArrayElementPtr requires a pointer to an array, got ${arrayPtr.type}`,
      );
    }

    const arrayType = arrayPtr.type.slice(0, -1);

    let indexValue = index;
    if (index.type !== "i32") {
      indexValue = this.convertValueToType(index, "i32");
    }

    const match = arrayType.match(/\[(\d+) x ([^\]]+)\]/);
    if (!match) {
      throw new Error(`Invalid array type: ${arrayType}`);
    }

    const elementType = match[2];
    const tmp = this.nextTemp();

    this.add(
      `${tmp} = getelementptr inbounds ${arrayType}, ${arrayPtr.type} ${arrayPtr.value}, i32 0, ${indexValue.type} ${indexValue.value}`,
    );

    return { value: tmp, type: `${elementType}*` };
  }

  public setArrayElement(
    arrayPtr: IRValue,
    index: IRValue,
    value: IRValue,
  ): void {
    const elementPtr = this.getArrayElementPtr(arrayPtr, index);
    const elementType = elementPtr.type.slice(0, -1);
    const convertedValue = this.convertValueToType(value, elementType);
    this.storeInst(convertedValue, elementPtr);
  }

  public getArrayElement(arrayPtr: IRValue, index: IRValue): IRValue {
    const elementPtr = this.getArrayElementPtr(arrayPtr, index);
    return this.loadInst(elementPtr);
  }

  public allocaMultiDimArrayInst(
    elementType: string,
    dimensions: number[],
  ): IRValue {
    let arrayType = elementType;
    for (let i = dimensions.length - 1; i >= 0; i--) {
      arrayType = `[${dimensions[i]} x ${arrayType}]`;
    }

    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }
  public getMultiDimArrayElementPtr(
    arrayPtr: IRValue,
    indices: IRValue[],
  ): IRValue {
    if (!arrayPtr.type.endsWith("*")) {
      throw new Error(
        `getMultiDimArrayElementPtr requires a pointer to an array, got ${arrayPtr.type}`,
      );
    }

    const arrayType = arrayPtr.type.slice(0, -1);

    const convertedIndices = indices.map((idx) =>
      idx.type !== "i32" ? this.convertValueToType(idx, "i32") : idx
    );

    const tmp = this.nextTemp();

    const indexStr = convertedIndices.map((idx) => `${idx.type} ${idx.value}`)
      .join(", ");

    this.add(
      `${tmp} = getelementptr inbounds ${arrayType}, ${arrayPtr.type} ${arrayPtr.value}, i32 0, ${indexStr}`,
    );

    let currentType = arrayType;
    for (let i = 0; i < convertedIndices.length; i++) {
      const match = currentType.match(/\[(\d+) x ([^\]]+)\]/);
      if (!match) {
        throw new Error(`Invalid array type at dimension ${i}: ${currentType}`);
      }
      currentType = match[2];
    }

    return { value: tmp, type: `${currentType}*` };
  }

  public setMultiDimArrayElement(
    arrayPtr: IRValue,
    indices: IRValue[],
    value: IRValue,
  ): void {
    const elementPtr = this.getMultiDimArrayElementPtr(arrayPtr, indices);
    const elementType = elementPtr.type.slice(0, -1);
    const convertedValue = this.convertValueToType(value, elementType);
    this.storeInst(convertedValue, elementPtr);
  }

  public getMultiDimArrayElement(
    arrayPtr: IRValue,
    indices: IRValue[],
  ): IRValue {
    const elementPtr = this.getMultiDimArrayElementPtr(arrayPtr, indices);
    return this.loadInst(elementPtr);
  }

  public createStructType(
    structName: string,
    fieldTypes: string[],
  ): string {
    const fieldsStr = fieldTypes.join(", ");
    return `%${structName} = type { ${fieldsStr} }`;
  }

  public allocaStructInst(structType: string): IRValue {
    const tmp = this.nextTemp();
    this.add(
      `${tmp} = alloca ${structType}, align ${this.getAlign(structType)}`,
    );
    return { value: tmp, type: `${structType}*` };
  }

  public getStructFieldPtr(
    structPtr: IRValue,
    fieldIndex: number,
    fieldType: string,
  ): IRValue {
    if (!structPtr.type.endsWith("*")) {
      throw new Error(
        `getStructFieldPtr requires a pointer to a struct, got ${structPtr.type}`,
      );
    }

    const structType = structPtr.type.slice(0, -1); // Remove the '*'
    const tmp = this.nextTemp();

    this.add(
      `${tmp} = getelementptr inbounds ${structType}, ${structPtr.type} ${structPtr.value}, i32 0, i32 ${fieldIndex}`,
    );

    return { value: tmp, type: `${fieldType}*` };
  }

  public setStructField(
    structPtr: IRValue,
    fieldIndex: number,
    fieldType: string,
    value: IRValue,
  ): void {
    const fieldPtr = this.getStructFieldPtr(structPtr, fieldIndex, fieldType);
    const convertedValue = this.convertValueToType(value, fieldType);
    this.storeInst(convertedValue, fieldPtr);
  }

  public getStructField(
    structPtr: IRValue,
    fieldIndex: number,
    fieldType: string,
  ): IRValue {
    const fieldPtr = this.getStructFieldPtr(structPtr, fieldIndex, fieldType);
    return this.loadInst(fieldPtr);
  }

  public allocaArrayOfStructsInst(structType: string, size: number): IRValue {
    const arrayType = `[${size} x ${structType}]`;
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }

  public getStructFromArray(
    arrayPtr: IRValue,
    index: IRValue,
    _structType: string,
  ): IRValue {
    return this.getArrayElementPtr(arrayPtr, index);
  }

  public getFieldFromArrayOfStructs(
    arrayPtr: IRValue,
    index: IRValue,
    fieldIndex: number,
    fieldType: string,
  ): IRValue {
    const structPtr = this.getStructFromArray(
      arrayPtr,
      index,
      // @ts-ignore: Dont have error
      arrayPtr.type.slice(0, -1).match(/\[\d+ x ([^\]]+)\]/)[1],
    );
    return this.getStructFieldPtr(structPtr, fieldIndex, fieldType);
  }

  public loadFieldFromArrayOfStructs(
    arrayPtr: IRValue,
    index: IRValue,
    fieldIndex: number,
    fieldType: string,
  ): IRValue {
    const fieldPtr = this.getFieldFromArrayOfStructs(
      arrayPtr,
      index,
      fieldIndex,
      fieldType,
    );
    return this.loadInst(fieldPtr);
  }

  public storeFieldInArrayOfStructs(
    arrayPtr: IRValue,
    index: IRValue,
    fieldIndex: number,
    fieldType: string,
    value: IRValue,
  ): void {
    const fieldPtr = this.getFieldFromArrayOfStructs(
      arrayPtr,
      index,
      fieldIndex,
      fieldType,
    );
    const convertedValue = this.convertValueToType(value, fieldType);
    this.storeInst(convertedValue, fieldPtr);
  }

  private isArrayType(type: string): boolean {
    return type.startsWith("[") && type.includes("x");
  }

  private getArrayElementType(arrayType: string): string {
    const match = arrayType.match(/\[\d+ x ([^\]]+)\]/);
    return match ? match[1] : "";
  }
}
