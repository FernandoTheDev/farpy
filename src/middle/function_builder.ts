/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { LLVMType } from "../frontend/parser/ast.ts";
import {
  StdLibFunction,
  StdLibModuleBuilder,
} from "./std_lib_module_builder.ts";
import { getTypeChecker, TypeChecker } from "./type_checker.ts";

export class FunctionBuilder {
  private function: Partial<StdLibFunction>;
  private moduleBuilder: StdLibModuleBuilder;
  private typeChecker: TypeChecker;

  constructor(
    name: string,
    moduleBuilder: StdLibModuleBuilder,
    private readonly reporter?: DiagnosticReporter,
  ) {
    this.function = {
      name,
      isStdLib: true,
      isVariadic: false, // default value
      params: [], // default empty params
    };
    this.moduleBuilder = moduleBuilder;
    this.typeChecker = getTypeChecker(reporter);
  }

  returns(type: string): FunctionBuilder {
    this.function.returnType = type;
    // Set default LLVM type based on return type
    this.function.llvmType = this.typeChecker.mapToLLVMType(type);
    return this;
  }

  withParams(...params: string[]): FunctionBuilder {
    this.function.params = params;
    return this;
  }

  variadic(): FunctionBuilder {
    this.function.isVariadic = true;
    return this;
  }

  llvmName(name: string): FunctionBuilder {
    this.function.llvmName = name;
    return this;
  }

  withIR(ir: string): FunctionBuilder {
    this.function.ir = ir;
    return this;
  }

  customLLVMType(llvmType: LLVMType): FunctionBuilder {
    this.function.llvmType = llvmType;
    return this;
  }

  generateIR(): FunctionBuilder {
    if (this.function.ir) return this; // IR already exists

    const fnName = this.function.llvmName || this.function.name;
    const returnType = this.typeChecker.getLLVMTypeString(
      this.function.llvmType!,
    );

    let paramTypes = this.function.params!.map((p) => {
      const llvmType = this.typeChecker.mapToLLVMType(p);
      return this.typeChecker.getLLVMTypeString(llvmType);
    }).join(", ");

    if (this.function.isVariadic) {
      paramTypes += paramTypes ? ", ..." : "...";
    }

    this.function.ir = `declare ${returnType} @${fnName}(${paramTypes})`;
    return this;
  }

  done(): StdLibModuleBuilder {
    if (!this.function.returnType) {
      throw new Error(`Function ${this.function.name} must have a return type`);
    }

    // Auto-generate IR if not provided
    this.generateIR();

    this.moduleBuilder.addCompleteFunction(this.function as StdLibFunction);
    return this.moduleBuilder;
  }
}
