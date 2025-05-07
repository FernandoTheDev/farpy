/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { DiagnosticReporter } from "../error/diagnosticReporter.ts";
import {
  StdLibFunction,
  StdLibModule,
  StdLibModuleBuilder,
} from "./std_lib_module_builder.ts";

function defineModule(name: string): StdLibModuleBuilder {
  return new StdLibModuleBuilder(name);
}

// Create IO module with fluent API
function createIOModule(): StdLibModule {
  return defineModule("io")
    // print(string)
    .defineFunction("print")
    .returns("void")
    .withParams("string")
    .done()
    // printf(string, ...)
    .defineFunction("printf")
    .returns("int")
    .withParams("string")
    .variadic()
    .done()
    // scanf(string, ...)
    .defineFunction("scanf")
    .returns("int")
    .withParams("string")
    .variadic()
    .done()
    // read_line(string)
    .defineFunction("read_line")
    .returns("string")
    .done()
    // Build
    .defineFlags("-lc")
    .build();
}

// Create Math module with fluent API
function createMathModule(): StdLibModule {
  return defineModule("math")
    // sin(x)
    .defineFunction("sin")
    .returns("double")
    .withParams("double")
    .done()
    // cos(x)
    .defineFunction("cos")
    .returns("double")
    .withParams("double")
    .done()
    // tan(x)
    .defineFunction("tan")
    .returns("double")
    .withParams("double")
    .done()
    // log(x)
    .defineFunction("log")
    .returns("double")
    .withParams("double")
    .done()
    // exp(x)
    .defineFunction("exp")
    .returns("double")
    .withParams("double")
    .done()
    // sqrt(x)
    .defineFunction("sqrt")
    .returns("double")
    .withParams("double")
    .done()
    // pow(x, y)
    .defineFunction("pow")
    .returns("double")
    .withParams("double", "double")
    .done()
    // pi()
    .defineFunction("pi")
    .returns("double")
    .withParams()
    .withIR("define double @pi() { ret double 3.141592653589793 }")
    .done()
    // e()
    .defineFunction("e")
    .returns("double")
    .withParams()
    .withIR("define double @e() { ret double 2.718281828459045 }")
    .done()
    // init_fib()
    .defineFunction("init_fib")
    .returns("void")
    .done()
    .defineFunction("fibonacci")
    .returns("int")
    .withParams("int")
    .done()
    // fibonacci(n: int)
    .defineFlags("-lm") // math.h
    // Build
    .build();
}

// Create String module with fluent API
function createStringModule(): StdLibModule {
  return defineModule("string")
    .defineFunction("length")
    .returns("int")
    .withParams("string")
    .llvmName("strlen")
    .done()
    .defineFunction("concat")
    .returns("string")
    .withParams("string", "string")
    .llvmName("strcat")
    .done()
    .defineFunction("substring")
    .returns("string")
    .withParams("string", "int", "int")
    .llvmName("substring")
    .done()
    .build();
}

function createTypesModule(): StdLibModule {
  return defineModule("types")
    // Float to Double Conversion
    .defineFunction("ftod")
    .returns("double")
    .withParams("float")
    .done()
    // Int to Double Conversion
    .defineFunction("itod")
    .returns("double")
    .withParams("int")
    .done()
    // Int to Float Conversion
    .defineFunction("itof")
    .returns("float")
    .withParams("int")
    .done()
    // Double to Float Conversion
    .defineFunction("dtof")
    .returns("float")
    .withParams("double")
    .done()
    // Double to Int Conversion
    .defineFunction("dtoi")
    .returns("int")
    .withParams("double")
    .done()
    // Float to Int Conversion
    .defineFunction("ftoi")
    .returns("int")
    .withParams("float")
    .done()
    // Build
    .build();
}

export class StandardLibrary {
  private static instance: StandardLibrary;
  private modules: Map<string, StdLibModule> = new Map();

  private constructor(private readonly reporter?: DiagnosticReporter) {
    this.initializeModules();
  }

  public static getInstance(reporter?: DiagnosticReporter): StandardLibrary {
    if (!StandardLibrary.instance) {
      StandardLibrary.instance = new StandardLibrary(reporter);
    }
    return StandardLibrary.instance;
  }

  public getModule(name: string): StdLibModule | undefined {
    return this.modules.get(name);
  }

  public hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  public getAllModules(): Map<string, StdLibModule> {
    return this.modules;
  }

  public registerModule(module: StdLibModule): void {
    this.modules.set(module.name, module);
  }

  public getFunctionInfo(
    moduleName: string,
    functionName: string,
  ): StdLibFunction | undefined {
    const module = this.modules.get(moduleName);
    if (!module) return undefined;
    return module.functions.get(functionName);
  }

  public generateAllModulesIR(): string {
    let ir = "";

    for (const [_, module] of this.modules) {
      ir += `\n; Module: ${module.name}\n`;
      for (const [_, func] of module.functions) {
        if (func.ir) {
          ir += func.ir + "\n";
        }
      }
    }

    return ir;
  }

  private initializeModules(): void {
    this.registerModule(createIOModule());
    this.registerModule(createMathModule());
    this.registerModule(createStringModule());
    this.registerModule(createTypesModule());
  }
}
