/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { LLVMType, TypeInfo } from "../frontend/parser/ast.ts";
import { FunctionBuilder } from "./function_builder.ts";

export interface StdLibFunction {
  name: string;
  returnType: TypeInfo;
  llvmType: LLVMType | string;
  params: string[];
  isVariadic: boolean;
  llvmName: string;
  ir?: string;
  isStdLib?: boolean;
}

export interface Function {
  name: string;
  returnType: TypeInfo;
  params: { name: string; type: TypeInfo; llvmType: string }[];
  isVariadic: boolean;
  llvmType: LLVMType;
}

export interface StdLibModule {
  name: string;
  functions: Map<string, StdLibFunction>;
  flags?: string[];
}

export class StdLibModuleBuilder {
  private module: StdLibModule;

  constructor(name: string, private readonly reporter?: DiagnosticReporter) {
    this.module = {
      name,
      functions: new Map(),
    };
  }

  defineFunction(name: string): FunctionBuilder {
    return new FunctionBuilder(name, this, this.reporter);
  }

  defineFlags(...flags: string[]): StdLibModuleBuilder {
    this.module.flags = flags;
    return this;
  }

  addCompleteFunction(func: StdLibFunction): void {
    this.module.functions.set(func.name, func);
  }

  build(): StdLibModule {
    return this.module;
  }
}
