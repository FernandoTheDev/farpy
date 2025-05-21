/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { Semantic } from "../middle/semantic.ts";
import { StdLibModule } from "../middle/std_lib_module_builder.ts";
import process from "node:process";

// ANSI color codes for beautiful terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m",
  },

  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m",
  },
};

export class Logger {
  static success(message: string): void {
    console.log(
      `${colors.fg.green}${colors.bright}✓ ${message}${colors.reset}`,
    );
  }

  static info(message: string): void {
    console.log(`${colors.fg.cyan}ℹ ${message}${colors.reset}`);
  }

  static warning(message: string): void {
    console.log(`${colors.fg.yellow}⚠ ${message}${colors.reset}`);
  }

  static error(message: string, details?: string): void {
    console.error(
      `${colors.fg.red}${colors.bright}✗ ${message}${colors.reset}`,
    );
    if (details) {
      console.error(`${colors.dim}${details}${colors.reset}`);
    }
  }

  static step(index: number, total: number, message: string): void {
    const percent = Math.round((index / total) * 100);
    console.log(
      `${colors.fg.magenta}[${index}/${total}] ${colors.fg.cyan}${percent}% ${colors.bright}${message}${colors.reset}`,
    );
  }

  static header(message: string): void {
    const line = "─".repeat(message.length + 4);
    console.log(`\n${colors.fg.blue}┌${line}┐`);
    console.log(`│  ${colors.bright}${message}${colors.fg.blue}  │`);
    console.log(`└${line}┘${colors.reset}\n`);
  }

  static progressBar(percent: number, width = 30): void {
    const completed = Math.floor(width * (percent / 100));
    const remaining = width - completed;
    const bar = `${colors.bg.cyan}${
      " ".repeat(completed)
    }${colors.reset}${colors.dim}${" ".repeat(remaining)}${colors.reset}`;
    process.stdout.write(
      `\r${colors.fg.white}[${bar}] ${percent}%${colors.reset}`,
    );
    if (percent === 100) console.log();
  }

  static spinner(
    message: string,
    frames = ["-", "\\", "|", "/"],
    delay = 80,
  ): { stop: () => void } {
    let i = 0;
    const timer = setInterval(() => {
      process.stdout.write(
        `\r${colors.fg.cyan}${
          frames[i++ % frames.length]
        } ${message}${colors.reset}`,
      );
    }, delay);

    return {
      stop: (success = true, finalMessage?: string) => {
        clearInterval(timer);
        const icon = success ? `${colors.fg.green}✓` : `${colors.fg.red}✗`;
        process.stdout.write(
          `\r${icon} ${finalMessage || message}${colors.reset}\n`,
        );
      },
    };
  }
}

const compilationQuotes = [
  "Assembling the code atoms...",
  "Converting caffeine to code...",
  "Convincing the CPU to cooperate...",
  "Forging digital magic...",
  "Harmonizing binary symphonies...",
  "Instructing electrons where to go...",
  "Negotiating with the machine...",
  "Optimizing at the speed of light...",
  "Performing code alchemy...",
  "Translating human creativity into silicon logic...",
];

export class FarpyCompiler {
  private tempFiles: string[] = [];
  private stdLibFiles: string[] = [];
  private compilationStartTime: number = 0;
  private totalSteps: number = 0;
  private currentStep: number = 0;

  constructor(
    private sourceCode: string,
    private outputFile: string,
    private instance: Semantic,
    private debug: boolean = false,
    private target: string = "",
    private externs: string[] = [],
  ) {
    // Calculate total steps for progress tracking
    this.totalSteps = 4; // Base compilation steps
    if (this.externs.length > 0) this.totalSteps += 1;
    if (this.instance.stdLibs.size > 0) this.totalSteps += 1;
  }

  private log(message: string): void {
    if (this.debug) Logger.info(message);
  }

  private logStep(message: string): void {
    this.currentStep++;
    if (this.debug) {
      Logger.step(this.currentStep, this.totalSteps, message);
    }
  }

  private getRandomQuote(): string {
    return compilationQuotes[
      Math.floor(Math.random() * compilationQuotes.length)
    ];
  }

  private formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    const seconds = milliseconds / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const stat = await Deno.stat(path);
      return stat.isFile;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return false;
      } else {
        throw err;
      }
    }
  }

  private async executeCommand(
    cmd: string,
    args: string[],
    errorMessage: string,
    progressMessage: string = "",
  ): Promise<void> {
    if (this.debug) {
      this.log(`Running: ${colors.dim}${cmd} ${args.join(" ")}${colors.reset}`);

      if (progressMessage) {
        const spinner = Logger.spinner(progressMessage);

        try {
          const command = new Deno.Command(cmd, { args });
          const { code, stderr } = await command.output();

          if (code !== 0) {
            spinner.stop();
            Logger.error(
              errorMessage,
              new TextDecoder().decode(stderr),
            );
            Deno.exit(-1);
          }

          spinner.stop();
        } catch (error) {
          spinner.stop();
          throw error;
        }
      } else {
        const command = new Deno.Command(cmd, { args });
        const { code, stderr } = await command.output();

        if (code !== 0) {
          Logger.error(
            errorMessage,
            new TextDecoder().decode(stderr),
          );
          Deno.exit(-1);
        }
      }
    } else {
      const command = new Deno.Command(cmd, { args });
      const { code, stderr } = await command.output();

      if (code !== 0) {
        console.error(
          errorMessage,
          new TextDecoder().decode(stderr),
        );
        Deno.exit(-1);
      }
    }
  }

  private createTempFile(suffix: string): string {
    const tempFile = Deno.makeTempFileSync({ suffix });
    this.tempFiles.push(tempFile);
    return tempFile;
  }

  private async compileExternFiles(destFile: string): Promise<void> {
    if (this.externs.length === 0) return;

    this.logStep("Processing external dependencies");

    if (this.debug) Logger.header("External Dependencies Compilation");
    this.log(`Found ${this.externs.length} external files to compile`);

    const file = this.createTempFile(".c");

    const cleanExterns = this.externs.map((extern) => {
      return extern.replace(/"([^"]*)"/g, (match) => {
        return match.replace(/\n/g, "\\n");
      });
    });

    Deno.writeTextFileSync(file, cleanExterns.join("\n"));

    const fileBc = this.createTempFile(".ll");
    const args = [
      file,
      "-S",
      "-emit-llvm",
      "-o",
      fileBc,
      "-Wno-implicit-function-declaration",
    ];
    if (this.target) args.push("-target", this.target);

    await this.executeCommand(
      "clang",
      args,
      `Error compiling extern file:`,
      "Compiling external dependencies",
    );

    await this.executeCommand(
      "llvm-link",
      [destFile, fileBc, "-o", destFile],
      "Error linking libraries:",
      "Linking external dependencies",
    );

    if (this.debug) Logger.info("External dependencies processed successfully");
  }

  private async compileStdLibs(
    stdLibs: Map<string, StdLibModule>,
    destFile: string,
  ): Promise<string[]> {
    if (stdLibs.size === 0) return [];

    this.logStep("Compiling standard libraries");

    if (this.debug) Logger.header("Standard Libraries Compilation");
    this.log(`Found ${stdLibs.size} standard libraries to compile`);

    const modulesArgs: string[] = [];
    let libCounter = 0;

    for (const [lib, module] of stdLibs) {
      libCounter++;
      const libFile = this.createTempFile(".bc");
      this.stdLibFiles.push(libFile);
      let libPath = ``;

      const home = Deno.env.get("HOME");

      if (!home) {
        Logger.error(
          "Could not get $HOME variable from your environment.",
        );
        throw new Error(
          "Could not get $HOME variable from your environment.",
        );
      }

      const path = `${home}/.farpy/libs/`;

      if (await this.fileExists(`${path}${lib}.c`)) {
        libPath = `${path}${lib}.c`;
      } else {
        Logger.error(`Source file for library "${lib}" not found.`);
        throw new Error(`Source file for library "${lib}" not found.`);
      }

      let args = [libPath, "-c", "-emit-llvm", "-o", libFile];

      if (module.flags) {
        args = [...args, ...module.flags];
        modulesArgs.push(...module.flags);
      }

      if (this.target) args.push("-target", this.target);

      if (this.debug) {
        const percent = Math.round((libCounter / stdLibs.size) * 100);
        Logger.progressBar(percent);
      }

      await this.executeCommand(
        "clang",
        args,
        `Error compiling ${lib} library:`,
        `Compiling ${lib} library (${libCounter}/${stdLibs.size})`,
      );
    }

    if (this.stdLibFiles.length > 0) {
      this.log("Linking libraries with user code...");
      await this.executeCommand(
        "llvm-link",
        [destFile, ...this.stdLibFiles, "-o", destFile],
        "Error linking libraries:",
        "Linking standard libraries with user code",
      );
    }

    if (this.debug) Logger.info("Standard libraries compiled successfully");
    return modulesArgs;
  }

  private cleanupTempFiles(): void {
    if (this.debug) {
      const spinner = Logger.spinner("Cleaning up temporary files");

      for (const file of this.tempFiles) {
        try {
          Deno.removeSync(file);
        } catch (e: any) {
          if (this.debug) {
            Logger.warning(
              `Could not remove temporary file ${file}: ${e.message}`,
            );
          }
        }
      }

      spinner.stop();
    } else {
      for (const file of this.tempFiles) {
        try {
          Deno.removeSync(file);
        } catch (_e) {
          // Silent cleanup in non-debug mode
        }
      }
    }
  }

  public async compile(): Promise<void> {
    this.compilationStartTime = performance.now();

    if (this.debug) {
      Logger.header("Farpy Compiler 🚀");
      this.log(`Output file: ${this.outputFile}`);
      if (this.target) this.log(`Target: ${this.target}`);
      console.log(); // Empty line for better readability
    }

    const file_ll = this.createTempFile(".ll");
    const file_bc = this.createTempFile(".bc");

    try {
      Deno.writeTextFileSync(file_ll, this.sourceCode);

      this.logStep("Compiling LLVM IR to bitcode");
      await this.executeCommand(
        "llvm-as",
        [file_ll, "-o", file_bc],
        "Error compiling .ll to .bc:",
        `${this.getRandomQuote()}`,
      );
      if (this.debug) Logger.success("LLVM IR compilation completed");

      await this.compileExternFiles(file_bc);
      const moduleArgs = await this.compileStdLibs(
        this.instance.stdLibs,
        file_bc,
      );

      this.logStep("Compiling bitcode to binary");
      if (this.debug) Logger.header("Final Compilation Phase");

      const args = [
        file_bc,
        "-fPIE",
        "-o",
        this.outputFile,
        "-march=native",
        "-mtune=native",
        "-ftree-vectorize",
        "-fdata-sections",
        "-ffunction-sections",
        "-Wl,--gc-sections",
        "-Wl,-s",
        "-fomit-frame-pointer",
        "-fstrict-aliasing",
        "-ffast-math",
        "-fno-rtti",
        "-funwind-tables",
        "-g0",
        ...moduleArgs,
      ];
      if (this.target) args.push("-target", this.target);

      await this.executeCommand(
        "clang",
        args,
        "Error compiling binary:",
        "Transforming bitcode into executable magic",
      );
      if (this.debug) Logger.success("Binary compilation completed");

      this.logStep("Optimizing binary");
      await this.executeCommand(
        "strip",
        ["--strip-all", this.outputFile],
        "Error optimizing binary:",
        "Stripping unnecessary symbols",
      );

      await this.executeCommand(
        "upx",
        [this.outputFile, "--best"],
        "Error optimizing binary with upx:",
        "Applying UPX compression for maximum efficiency",
      );

      const compilationTime = performance.now() - this.compilationStartTime;

      if (this.debug) {
        Logger.header("Compilation Complete 🎉");
        console.log(
          `${colors.fg.green}${colors.bright}✓ Successfully compiled to ${this.outputFile}${colors.reset}`,
        );
        console.log(
          `${colors.fg.cyan}ℹ Compilation time: ${
            this.formatDuration(compilationTime)
          }${colors.reset}`,
        );
      } else {
        Logger.success(
          `Successfully compiled to ${this.outputFile} in ${
            this.formatDuration(compilationTime)
          }`,
        );
      }
      // Get file size
      try {
        const fileInfo = Deno.statSync(this.outputFile);
        const sizeInKB = fileInfo.size / 1024;
        const sizeFormatted = sizeInKB < 1024
          ? `${sizeInKB.toFixed(2)} KB`
          : `${(sizeInKB / 1024).toFixed(2)} MB`;
        console.log(
          `${colors.fg.white}${colors.bright}Output binary size: ${sizeFormatted}${colors.reset}`,
        );
      } catch (_e) {
        // Silently fail if we can't get file size
      }
    } catch (error: any) {
      if (this.debug) {
        Logger.error("Compilation failed", error.message);
        console.log(`\n${colors.fg.yellow}Stack trace:${colors.reset}`);
        console.log(colors.dim + error.stack + colors.reset);
      } else {
        console.error("Compilation failed:", error.message);
      }
      Deno.exit(1);
    } finally {
      this.cleanupTempFiles();
    }
  }
}
