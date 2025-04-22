/**
 * Farpy - A programming language
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

const ARG_CONFIG = {
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
};

const VERSION = "alpha 0.0.1";

const HELP_MESSAGE = `Farpy Compiler ${VERSION}

USAGE:
  farpy [OPTIONS] <FILE>

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Display version information
  --ast-json              Output AST as JSON and exit
  --ast-json-save=<file>  Save AST JSON to specified file (default: ast.json)
  -o, --output=<file>     Specify output file name (default: a.out)
  --debug                 Enable debug mode
  --emit-llvm-ir          Output LLVM IR and exit`;

class FarpyCompilerMain {
  private fileName: string;
  private fileData: string;
  private reporter: DiagnosticReporter;
  private args: any;

  constructor(args: string[]) {
    this.args = parseArgs(args, ARG_CONFIG);
    this.reporter = new DiagnosticReporter();

    if (this.shouldShowHelp()) {
      this.showHelp();
      Deno.exit(0);
    }

    if (this.shouldShowVersion()) {
      this.showVersion();
      Deno.exit(0);
    }

    this.fileName = this.args._[0] as string;
    if (!this.validateFile()) {
      console.error("ERROR: Valid source file is required.");
      Deno.exit(-1);
    }

    this.fileData = Deno.readTextFileSync(this.fileName);
  }

  private shouldShowHelp(): boolean {
    return this.args.help === true;
  }

  private shouldShowVersion(): boolean {
    return this.args.version === true;
  }

  private showHelp(): void {
    console.log(HELP_MESSAGE);
  }

  private showVersion(): void {
    console.log(`Farpy Compiler ${VERSION}`);
  }

  private validateFile(): boolean {
    return typeof this.fileName === "string" && this.fileName.length > 0;
  }

  private runLexer(): Token[] | null {
    const tokens = new Lexer(this.fileName, this.fileData, this.reporter)
      .tokenize();

    if (this.reporter.hasWarnings() && !this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
    }

    if (this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
      return null;
    }

    return tokens as Token[];
  }

  private runParser(tokens: Token[]): any {
    const ast = new Parser(tokens, this.reporter).parse();

    if (this.reporter.hasWarnings() && !this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
    }

    if (this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
      return null;
    }

    return ast;
  }

  private handleAstJson(ast: any): boolean {
    if (this.args["ast-json"]) {
      Deno.writeTextFileSync(
        this.args["ast-json-save"],
        JSON.stringify(ast, null, "\t"),
      );
      return true;
    }
    return false;
  }

  private runSemanticAnalysis(ast: any): any {
    const semantic = Semantic.getInstance();
    return semantic.semantic(ast);
  }

  private generateLLVMIR(semanticAST: any, semantic: any): string {
    const llvmIrGen = LLVMIRGenerator.getInstance();
    return llvmIrGen.generateIR(semanticAST, semantic, this.fileName);
  }

  private handleEmitIR(llvmIR: string): boolean {
    if (this.args["emit-llvm-ir"]) {
      console.log(llvmIR);
      return true;
    }
    return false;
  }

  private async runBackendCompilation(
    llvmIR: string,
    semantic: any,
  ): Promise<void> {
    const compiler = new FarpyCompiler(
      llvmIR,
      this.args["output"],
      semantic,
      this.args["debug"],
    );
    await compiler.compile();
  }

  public async run(): Promise<void> {
    try {
      const tokens = this.runLexer();
      if (!tokens) return;

      const ast = this.runParser(tokens);
      if (!ast) return;

      if (this.handleAstJson(ast)) return;

      const semantic = Semantic.getInstance();
      const semanticAST = this.runSemanticAnalysis(ast);

      const llvmIR = this.generateLLVMIR(semanticAST, semantic);

      if (this.handleEmitIR(llvmIR)) return;

      await this.runBackendCompilation(llvmIR, semantic);
    } catch (error: any) {
      console.error("Compilation failed:", error.message);
      if (this.args["debug"]) {
        console.error(error.stack);
      }
      Deno.exit(1);
    }
  }
}

async function main() {
  const compiler = new FarpyCompilerMain(Deno.args);
  await compiler.run();
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
