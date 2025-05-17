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

  // Memory e ponteiros
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

  /**
   * Extensions to LLVMBasicBlock.ts to support arrays, array indexing,
   * structs, and multidimensional arrays
   */

  // =========== ARRAY SUPPORT ===========

  /**
   * Creates an array allocation on the stack
   *
   * @param elementType The type of elements in the array
   * @param size The number of elements in the array
   * @returns An IRValue pointing to the array
   */
  public allocaArrayInst(elementType: string, size: number): IRValue {
    const arrayType = `[${size} x ${elementType}]`;
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }

  /**
   * Creates a global array
   * This would typically be called by your module manager, not directly from the basic block
   *
   * @param name The name of the global array
   * @param elementType The type of elements in the array
   * @param size The number of elements in the array
   * @param initialValues Optional initial values for the array elements
   * @returns The IR code for the global array declaration
   */
  public static createGlobalArray(
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
      return `@${name} = global ${arrayType} [${initStr}]`;
    } else {
      return `@${name} = global ${arrayType} zeroinitializer`;
    }
  }

  /** x[index]
   * Gets a pointer to an element in an array
   *
   * @param arrayPtr The pointer to the array
   * @param index The IRValue representing the index
   * @returns An IRValue pointing to the element
   */
  public getArrayElementPtr(arrayPtr: IRValue, index: IRValue): IRValue {
    // Extract the array type from the pointer type
    if (!arrayPtr.type.endsWith("*")) {
      throw new Error(
        `getArrayElementPtr requires a pointer to an array, got ${arrayPtr.type}`,
      );
    }

    const arrayType = arrayPtr.type.slice(0, -1); // Remove the '*'

    // Check and convert index to i32 if needed
    let indexValue = index;
    if (index.type !== "i32") {
      indexValue = this.convertValueToType(index, "i32");
    }

    // Get a match for [N x type] to extract the element type
    const match = arrayType.match(/\[(\d+) x ([^\]]+)\]/);
    if (!match) {
      throw new Error(`Invalid array type: ${arrayType}`);
    }

    const elementType = match[2];
    const tmp = this.nextTemp();

    // Use GEP instruction to get element pointer
    this.add(
      `${tmp} = getelementptr inbounds ${arrayType}, ${arrayPtr.type} ${arrayPtr.value}, i32 0, ${indexValue.type} ${indexValue.value}`,
    );

    return { value: tmp, type: `${elementType}*` };
  }

  /** x[index] = value
   * Sets an element in an array
   *
   * @param arrayPtr The pointer to the array
   * @param index The index of the element to set
   * @param value The value to set
   */
  public setArrayElement(
    arrayPtr: IRValue,
    index: IRValue,
    value: IRValue,
  ): void {
    const elementPtr = this.getArrayElementPtr(arrayPtr, index);

    // Extract the element type from the pointer
    const elementType = elementPtr.type.slice(0, -1);

    // Convert the value to the element type if needed
    const convertedValue = this.convertValueToType(value, elementType);

    // Store the value
    this.storeInst(convertedValue, elementPtr);
  }

  /** x[index]
   * Gets an element from an array
   *
   * @param arrayPtr The pointer to the array
   * @param index The index of the element to get
   * @returns The IRValue of the loaded element
   */
  public getArrayElement(arrayPtr: IRValue, index: IRValue): IRValue {
    const elementPtr = this.getArrayElementPtr(arrayPtr, index);
    return this.loadInst(elementPtr);
  }

  // =========== MULTIDIMENSIONAL ARRAY SUPPORT ===========

  /**
   * Creates a multidimensional array allocation on the stack
   *
   * @param elementType The base type of elements in the array
   * @param dimensions The array dimensions (e.g., [3, 4] for a 3x4 array)
   * @returns An IRValue pointing to the multidimensional array
   */
  public allocaMultiDimArrayInst(
    elementType: string,
    dimensions: number[],
  ): IRValue {
    // Build the array type from innermost to outermost
    let arrayType = elementType;
    for (let i = dimensions.length - 1; i >= 0; i--) {
      arrayType = `[${dimensions[i]} x ${arrayType}]`;
    }

    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }

  /**
   * Gets a pointer to an element in a multidimensional array
   *
   * @param arrayPtr The pointer to the multidimensional array
   * @param indices The indices for each dimension
   * @returns An IRValue pointing to the element
   */
  public getMultiDimArrayElementPtr(
    arrayPtr: IRValue,
    indices: IRValue[],
  ): IRValue {
    if (!arrayPtr.type.endsWith("*")) {
      throw new Error(
        `getMultiDimArrayElementPtr requires a pointer to an array, got ${arrayPtr.type}`,
      );
    }

    const arrayType = arrayPtr.type.slice(0, -1); // Remove the '*'

    // Convert all indices to i32 if needed
    const convertedIndices = indices.map((idx) =>
      idx.type !== "i32" ? this.convertValueToType(idx, "i32") : idx
    );

    // Build the GEP instruction with all indices
    const tmp = this.nextTemp();

    // Format the indices, starting with a 0 for the pointer
    const indexStr = convertedIndices.map((idx) => `${idx.type} ${idx.value}`)
      .join(", ");

    this.add(
      `${tmp} = getelementptr inbounds ${arrayType}, ${arrayPtr.type} ${arrayPtr.value}, i32 0, ${indexStr}`,
    );

    // Determine the element type
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

  /**
   * Sets an element in a multidimensional array
   *
   * @param arrayPtr The pointer to the multidimensional array
   * @param indices The indices for each dimension
   * @param value The value to set
   */
  public setMultiDimArrayElement(
    arrayPtr: IRValue,
    indices: IRValue[],
    value: IRValue,
  ): void {
    const elementPtr = this.getMultiDimArrayElementPtr(arrayPtr, indices);

    // Extract the element type from the pointer
    const elementType = elementPtr.type.slice(0, -1);

    // Convert the value to the element type if needed
    const convertedValue = this.convertValueToType(value, elementType);

    // Store the value
    this.storeInst(convertedValue, elementPtr);
  }

  /**
   * Gets an element from a multidimensional array
   *
   * @param arrayPtr The pointer to the multidimensional array
   * @param indices The indices for each dimension
   * @returns The IRValue of the loaded element
   */
  public getMultiDimArrayElement(
    arrayPtr: IRValue,
    indices: IRValue[],
  ): IRValue {
    const elementPtr = this.getMultiDimArrayElementPtr(arrayPtr, indices);
    return this.loadInst(elementPtr);
  }

  // =========== STRUCT SUPPORT ===========

  /**
   * Creates a named struct type
   * This would typically be called by your module manager, not directly from the basic block
   *
   * @param structName The name of the struct
   * @param fieldTypes The types of the struct fields
   * @returns The IR code for the struct type definition
   */
  public static createStructType(
    structName: string,
    fieldTypes: string[],
  ): string {
    const fieldsStr = fieldTypes.join(", ");
    return `%${structName} = type { ${fieldsStr} }`;
  }

  /**
   * Allocates a struct on the stack
   *
   * @param structType The type of the struct (e.g., "%MyStruct")
   * @returns An IRValue pointing to the struct
   */
  public allocaStructInst(structType: string): IRValue {
    const tmp = this.nextTemp();
    this.add(
      `${tmp} = alloca ${structType}, align ${this.getAlign(structType)}`,
    );
    return { value: tmp, type: `${structType}*` };
  }

  /** x->y
   * Gets a pointer to a field in a struct
   *
   * @param structPtr The pointer to the struct
   * @param fieldIndex The index of the field (0-based)
   * @param fieldType The type of the field
   * @returns An IRValue pointing to the field
   */
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

  /** x->y = z
   * Sets a field in a struct
   *
   * @param structPtr The pointer to the struct
   * @param fieldIndex The index of the field (0-based)
   * @param fieldType The type of the field
   * @param value The value to set
   */
  public setStructField(
    structPtr: IRValue,
    fieldIndex: number,
    fieldType: string,
    value: IRValue,
  ): void {
    const fieldPtr = this.getStructFieldPtr(structPtr, fieldIndex, fieldType);

    // Convert the value to the field type if needed
    const convertedValue = this.convertValueToType(value, fieldType);

    // Store the value
    this.storeInst(convertedValue, fieldPtr);
  }

  /**
   * Gets a field from a struct
   *
   * @param structPtr The pointer to the struct
   * @param fieldIndex The index of the field (0-based)
   * @param fieldType The type of the field
   * @returns The IRValue of the loaded field
   */
  public getStructField(
    structPtr: IRValue,
    fieldIndex: number,
    fieldType: string,
  ): IRValue {
    const fieldPtr = this.getStructFieldPtr(structPtr, fieldIndex, fieldType);
    return this.loadInst(fieldPtr);
  }

  // =========== ARRAY OF STRUCTS & STRUCT OF ARRAYS SUPPORT ===========

  /**
   * Creates an array of structs
   *
   * @param structType The type of the struct (e.g., "%MyStruct")
   * @param size The number of structs in the array
   * @returns An IRValue pointing to the array of structs
   */
  public allocaArrayOfStructsInst(structType: string, size: number): IRValue {
    const arrayType = `[${size} x ${structType}]`;
    const tmp = this.nextTemp();
    this.add(`${tmp} = alloca ${arrayType}, align ${this.getAlign(arrayType)}`);
    return { value: tmp, type: `${arrayType}*` };
  }

  /**
   * Gets a pointer to a struct in an array of structs
   *
   * @param arrayPtr The pointer to the array of structs
   * @param index The index of the struct to access
   * @param structType The type of the struct
   * @returns An IRValue pointing to the struct
   */
  public getStructFromArray(
    arrayPtr: IRValue,
    index: IRValue,
    _structType: string,
  ): IRValue {
    return this.getArrayElementPtr(arrayPtr, index);
  }

  /**
   * Gets a pointer to a field in a struct within an array of structs
   *
   * @param arrayPtr The pointer to the array of structs
   * @param index The index of the struct in the array
   * @param fieldIndex The index of the field in the struct
   * @param fieldType The type of the field
   * @returns An IRValue pointing to the field
   */
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

  /**
   * Gets a field value from a struct within an array of structs
   *
   * @param arrayPtr The pointer to the array of structs
   * @param index The index of the struct in the array
   * @param fieldIndex The index of the field in the struct
   * @param fieldType The type of the field
   * @returns The IRValue of the loaded field
   */
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

  /**
   * Sets a field value in a struct within an array of structs
   *
   * @param arrayPtr The pointer to the array of structs
   * @param index The index of the struct in the array
   * @param fieldIndex The index of the field in the struct
   * @param fieldType The type of the field
   * @param value The value to set
   */
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

  // Helper method to determine if a type is an array type
  private isArrayType(type: string): boolean {
    return type.startsWith("[") && type.includes("x");
  }

  // Helper method to extract element type from an array type
  private getArrayElementType(arrayType: string): string {
    const match = arrayType.match(/\[\d+ x ([^\]]+)\]/);
    return match ? match[1] : "";
  }
}
