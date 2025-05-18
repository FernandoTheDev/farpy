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
import { Optimizer } from "./src/middle/optimizer.ts";
import { Program } from "./src/frontend/parser/ast.ts";
import { DeadCodeAnalyzer } from "./src/middle/dead_code_analyzer.ts";
import {
  ARG_CONFIG,
  HELP_MESSAGE,
  TARGET_HELP_MESSAGE,
  VERSION,
} from "./config.ts";
import { repl } from "./cli/repl.ts";

export class FarpyCompilerMain {
  private fileName: string;
  private fileData: string;
  private readonly reporter: DiagnosticReporter;
  private args: any;

  constructor(args: string[]) {
    this.args = parseArgs(args, ARG_CONFIG);
    this.reporter = new DiagnosticReporter();

    if (this.shouldShowTargetHelp()) {
      this.showTargetHelp();
      Deno.exit(0);
    }

    if (this.shouldShowHelp()) {
      this.showHelp();
      Deno.exit(0);
    }

    if (this.shouldShowVersion()) {
      this.showVersion();
      Deno.exit(0);
    }

    if (this.isCliMode()) {
      this.cliMode();
      Deno.exit(0);
    }

    this.fileName = this.args._[0] as string;
    if (!this.validateFile()) {
      console.error("ERROR: Valid source file is required.");
      Deno.exit(-1);
    }

    this.fileData = Deno.readTextFileSync(this.fileName);
  }

  private shouldShowTargetHelp(): boolean {
    return this.args.targeth === true;
  }

  private showTargetHelp(): void {
    console.log(TARGET_HELP_MESSAGE);
  }

  private shouldDeadCode(): boolean {
    return this.args.dc === true;
  }

  private shouldOptimize(): boolean {
    return this.args.optimize === true;
  }

  private shouldShowHelp(): boolean {
    return this.args.help === true;
  }

  private shouldShowVersion(): boolean {
    return this.args.version === true;
  }

  private isDebug(): boolean {
    return this.args.debug === true;
  }

  private isCliMode(): boolean {
    return this.args.cli === true;
  }

  private async cliMode(): Promise<void> {
    await repl();
  }

  private showHelp(): void {
    console.log(HELP_MESSAGE);
  }

  private showVersion(): void {
    console.log(`Farpy Compiler ${VERSION}`);
  }

  private validateFile(): boolean {
    return typeof this.fileName === "string" && this.fileName.length > 0 &&
      this.fileName.endsWith(".fp");
  }

  private checkErrorsAndWarnings(): boolean {
    if (this.reporter.hasWarnings() && !this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
    }

    if (this.reporter.hasErrors()) {
      this.reporter.printDiagnostics();
      console.log(this.reporter.getSummary());
      Deno.exit(-1);
    }

    return true;
  }

  private runLexer(): Token[] | null {
    const dir = Deno.cwd() + "/" +
      this.fileName.substring(0, this.fileName.lastIndexOf("/")) + "/";

    const tokens = new Lexer(
      this.fileName,
      this.fileData,
      dir,
      this.reporter,
    )
      .tokenize();

    if (!this.checkErrorsAndWarnings()) return null;

    return tokens as Token[];
  }

  private runParser(tokens: Token[]): Program | null {
    const ast = new Parser(tokens, this.reporter).parse();

    if (!this.checkErrorsAndWarnings()) return null;

    return ast;
  }

  private handleAstJson(ast: Program): boolean {
    if (this.args["ast-json"]) {
      Deno.writeTextFileSync(
        this.args["ast-json-save"],
        JSON.stringify(ast, null, "\t"),
      );
      return true;
    }
    return false;
  }

  private runDeadCodeAnalyzer(
    ast: Program,
    semantic: Semantic,
  ): Program | null {
    const analyzer = new DeadCodeAnalyzer(semantic, this.reporter).analyze(
      ast,
    );

    if (!this.checkErrorsAndWarnings()) return null;

    return analyzer;
  }

  private runOptimizer(ast: Program): Program | null {
    const optimizer = new Optimizer(this.reporter).resume(ast);

    if (!this.checkErrorsAndWarnings()) return null;

    return optimizer;
  }

  private generateLLVMIR(
    semanticAST: Program,
    semantic: Semantic,
    debug: boolean,
  ): { ir: string; externs: string[] } {
    const llvmIrGen = LLVMIRGenerator.getInstance(this.reporter, debug);
    const ir = llvmIrGen.generateIR(semanticAST, semantic, this.fileName);
    llvmIrGen.resetInstance(); // Reset
    return {
      ir: ir,
      externs: llvmIrGen.externs,
    };
  }

  private handleEmitIR(): boolean {
    return this.args["emit-llvm-ir"] != "";
  }

  private async runBackendCompilation(
    llvmIR: string,
    semantic: Semantic,
    target: string = "",
    externs: string[],
  ): Promise<void> {
    const compiler = new FarpyCompiler(
      llvmIR,
      this.args["output"],
      semantic,
      this.args["debug"],
      target,
      externs,
    );
    await compiler.compile();
  }

  public async run(): Promise<void> {
    try {
      const tokens = this.runLexer();
      if (!tokens) return;

      let ast = this.runParser(tokens);
      if (!ast) return;

      if (this.handleAstJson(ast)) return;

      const semantic = Semantic.getInstance(this.reporter);
      ast = semantic.semantic(ast);

      if (!this.checkErrorsAndWarnings()) return;

      semantic.resetInstance(); // Reset

      if (this.shouldOptimize()) {
        ast = this.runOptimizer(ast);
      }

      if (this.shouldDeadCode()) {
        ast = this.runDeadCodeAnalyzer(ast!, semantic);
      }

      const llvmIR = this.generateLLVMIR(
        ast!,
        semantic,
        this.isDebug(),
      );

      if (this.handleEmitIR()) {
        await Deno.writeFile(
          `${this.fileName.replace(".fp", ".ll")}`,
          new TextEncoder().encode(llvmIR.ir),
        );
        return;
      }

      await this.runBackendCompilation(
        llvmIR.ir,
        semantic,
        this.args.target ?? "",
        llvmIR.externs,
      );
    } catch (error: any) {
      console.error("Compilation failed:", error);
      if (this.args["debug"]) {
        console.error((error as any).stack);
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
