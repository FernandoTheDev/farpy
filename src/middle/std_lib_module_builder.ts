import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import { LLVMType } from "../frontend/parser/ast.ts";
import { TypesNative } from "../frontend/values.ts";
import { FunctionBuilder } from "./function_builder.ts";

export interface StdLibFunction {
  name: string;
  returnType: string;
  llvmType: LLVMType;
  params: string[];
  isVariadic: boolean;
  llvmName?: string;
  ir?: string;
  isStdLib?: boolean;
}

export interface Function {
  name: string;
  returnType: TypesNative | TypesNative[];
  params: { name: string; type: string; llvmType: string }[];
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
