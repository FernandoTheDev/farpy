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
import { ExternStatement, Program } from "./src/frontend/parser/ast.ts";
import { DeadCodeAnalyzer } from "./src/middle/dead_code_analyzer.ts";

const ARG_CONFIG = {
  alias: {
    h: "help",
    v: "version",
    astj: "ast-json",
    astjs: "ast-json-save",
    o: "output",
    eir: "emit-llvm-ir",
    opt: "optimize",
  },
  boolean: [
    "help",
    "version",
    "ast-json",
    "debug",
    "emit-llvm-ir",
    "targeth",
    "optmize",
    "g",
  ],
  string: ["ast-json-save", "output", "target"],
  default: { "ast-json-save": "ast.json", "output": "a.out" },
};

const VERSION = "alpha 0.0.1";

const TARGET_HELP_MESSAGE = `Farpy Compiler - Target Architecture Help

Supports the following target architectures:
     x86_64-linux-gnu              - 64-bit x86, Linux
     i386-linux-gnu                - 32-bit x86, Linux
     aarch64-linux-gnu             - ARM 64-bit, Linux
     arm-linux-gnueabi             - ARM 32-bit (EABI), Linux
     armv7-linux-gnueabihf         - ARM 32-bit (hard-float ABI), Linux
     x86_64-apple-macosx           - 64-bit Intel, macOS
     arm64-apple-macosx            - ARM64 (Apple Silicon), macOS
     i386-apple-macosx             - 32-bit Intel, macOS (deprecated, but still supported for compatibility)
     armv7-apple-ios               - ARM 32-bit, iOS (for older devices)
     arm64-apple-ios               - ARM 64-bit, iOS (Apple Silicon)
     x86_64-pc-windows-gnu         - 64-bit x86, Windows with GNU tools (MinGW)
     x86_64-w64-mingw32            - 64-bit x86, Windows (MinGW toolchain)
     i386-pc-windows-gnu           - 32-bit x86, Windows with GNU tools
     arm64-pc-windows-msvc         - ARM 64-bit, Windows (MSVC toolchain)
     x86_64-pc-windows-msvc        - 64-bit x86, Windows (MSVC toolchain)
     armv7a-linux-androideabi      - ARM 32-bit, Android
     aarch64-linux-android         - ARM 64-bit, Android
     x86_64-linux-android          - 64-bit Intel, Android
     i686-linux-android            - 32-bit Intel, Android
     arm64-apple-ios               - ARM 64-bit, iOS
     armv7-apple-ios               - ARM 32-bit, iOS (for older devices)
     x86_64-apple-ios-simulator    - Intel 64-bit, iOS simulator (for development)
     arm64-apple-ios-simulator     - ARM 64-bit, iOS simulator (for Apple Silicon)
     wasm32-unknown-unknown        - WebAssembly 32-bit
     wasm64-unknown-unknown        - WebAssembly 64-bit
     armv6-unknown-linux-gnueabi   - ARMv6, Linux (like Raspberry Pi 1)
     armv7-unknown-linux-gnueabihf - ARMv7, Linux (like Raspberry Pi 2/3)
     aarch64-unknown-linux-gnu     - ARM64, Linux (like Raspberry Pi 4)
     x86_64-unknown-freebsd        - 64-bit x86, FreeBSD
     i386-unknown-freebsd          - 32-bit x86, FreeBSD
     aarch64-unknown-freebsd       - ARM 64-bit, FreeBSD
     powerpc64-linux-gnu           - PowerPC 64-bit, Linux
     ppc64le-linux-gnu             - PowerPC 64-bit little-endian, Linux
     powerpc-apple-darwin          - PowerPC, macOS (for older versions)
     mips64el-linux-gnuabi64       - MIPS 64-bit little-endian, Linux
     mipsel-linux-gnu              - MIPS 32-bit little-endian, Linux
     sparc64-linux-gnu             - SPARC 64-bit, Linux
     riscv64-unknown-linux-gnu     - RISC-V 64-bit, Linux
     s390x-linux-gnu               - IBM Z (formerly System z), Linux`;

const HELP_MESSAGE = `Farpy Compiler ${VERSION}

USAGE:
  farpy [OPTIONS] <FILE>

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Display version information
  --ast-json              Output AST as JSON and exit
  --ast-json-save=<file>  Save AST JSON to specified file (default: ast.json)
  -o, --output=<file>     Specify output file name (default: a.out)
  --opt, --optimize       Enable optimization in AST
  --debug                 Enable debug mode
  --emit-llvm-ir          Output LLVM IR and exit
  --target=<target>       Specify target architecture (default: your architecture)
  --targeth               Show target architecture help`;

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
    return this.args.g === true;
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

  private runParser(tokens: Token[]): any {
    const ast = new Parser(tokens, this.reporter).parse();

    if (!this.checkErrorsAndWarnings()) return null;

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

  private runDeadCodeAnalyzer(ast: Program, semantic: Semantic): any {
    const analyzer = new DeadCodeAnalyzer(semantic, this.reporter).analyze(
      ast,
    );

    if (!this.checkErrorsAndWarnings()) return null;

    return analyzer;
  }

  private runOptimizer(ast: Program): any {
    const optimizer = new Optimizer(this.reporter).resume(ast);

    if (!this.checkErrorsAndWarnings()) return null;

    return optimizer;
  }

  private generateLLVMIR(
    semanticAST: any,
    semantic: any,
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
      semantic.resetInstance(); // Reset

      if (this.shouldOptimize()) {
        ast = this.runOptimizer(ast);
      }

      const final_ast = this.runDeadCodeAnalyzer(ast, semantic);

      const llvmIR = this.generateLLVMIR(
        final_ast,
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
