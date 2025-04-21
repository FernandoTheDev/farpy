/**
 * Farpy - A custom programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { parseArgs } from "jsr:@std/cli";
import { Lexer } from "./src/frontend/lexer/lexer.ts";
import { Parser } from "./src/frontend/parser/parser.ts";
import { Semantic } from "./src/middle/semantic.ts";
import { LLVMIRGenerator } from "./src/middle/llvm_ir_gen.ts";
import { FarpyCompiler } from "./src/backend/compiler.ts";
import { DiagnosticReporter } from "./src/error/diagnosticReporter.ts";
import { Token } from "./src/frontend/lexer/token.ts";

const parsedArgs = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
    astj: "ast-json",
    astjs: "ast-json-save",
    o: "output",
    eir: "emit-llvm-ir",
  },
  boolean: ["help", "version", "ast-json", "debug", "emit-llvm-ir"],
  string: ["ast-json-save", "output"],
  default: { "ast-json-save": "ast.json", "output": "a.out" },
});

const fileName: string = parsedArgs._[0] as string;

if (!fileName) {
  console.error("ERROR: File is expected.");
  Deno.exit(-1);
}

const fileData = Deno.readTextFileSync(fileName);
const reporter = new DiagnosticReporter();

const tokens = new Lexer(fileName, fileData, reporter).tokenize();

if (reporter.hasWarnings() && !reporter.hasErrors()) {
  reporter.printDiagnostics();
  console.log(reporter.getSummary());
}

if (reporter.hasErrors()) {
  reporter.printDiagnostics();
  console.log(reporter.getSummary());
  Deno.exit(-1);
}

const ast = new Parser(tokens as Token[], reporter).parse();

if (reporter.hasWarnings() && !reporter.hasErrors()) {
  reporter.printDiagnostics();
  console.log(reporter.getSummary());
}

if (reporter.hasErrors()) {
  reporter.printDiagnostics();
  console.log(reporter.getSummary());
  Deno.exit(-1);
}

if (parsedArgs["ast-json"]) {
  Deno.writeTextFileSync(
    parsedArgs["ast-json-save"],
    JSON.stringify(ast, null, "\t"),
  );
  Deno.exit(0);
}

const semantic = Semantic.getInstance();
// console.log(semantic.semantic(ast));

const llvm_ir_gen = LLVMIRGenerator.getInstance();
const llvm_ir = llvm_ir_gen.generateIR(
  semantic.semantic(ast),
  semantic,
  fileName,
);

if (parsedArgs["emit-llvm-ir"]) {
  console.log(llvm_ir);
  Deno.exit(0);
}

const compiler = new FarpyCompiler(
  llvm_ir,
  parsedArgs["output"],
  semantic,
  parsedArgs["debug"],
);
await compiler.compile();
