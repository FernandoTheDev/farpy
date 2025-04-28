import { Semantic } from "../middle/semantic.ts";
import { StdLibModule } from "../middle/std_lib_module_builder.ts";

export class FarpyCompiler {
  private tempFiles: string[] = [];
  private stdLibFiles: string[] = [];

  constructor(
    private sourceCode: string,
    private outputFile: string,
    private instance: Semantic,
    private debug: boolean = false,
    private target: string = "",
  ) {}

  private log(message: string): void {
    if (this.debug) console.log(message);
  }

  private async executeCommand(
    cmd: string,
    args: string[],
    errorMessage: string,
  ): Promise<void> {
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

  private createTempFile(suffix: string): string {
    const tempFile = Deno.makeTempFileSync({ suffix });
    this.tempFiles.push(tempFile);
    return tempFile;
  }

  private async compileStdLibs(
    stdLibs: Map<string, StdLibModule>,
    destFile: string,
  ): Promise<string[]> {
    if (stdLibs.size === 0) return [];

    this.log("Compiling standard libraries...");
    const modulesArgs: string[] = [];

    for (const [lib, module] of stdLibs) {
      const libFile = this.createTempFile(".bc");
      this.stdLibFiles.push(libFile);

      let args = [`./stdlib/${lib}.c`, "-c", "-emit-llvm", "-o", libFile];

      if (module.flags) {
        args = [...args, ...module.flags];
        modulesArgs.push(...module.flags);
      }

      if (this.target) args.push("-target", this.target);

      await this.executeCommand(
        "clang",
        args,
        `Error compiling ${lib} library:`,
      );
    }

    if (this.stdLibFiles.length > 0) {
      this.log("Linking libraries with user code...");
      await this.executeCommand(
        "llvm-link",
        [destFile, ...this.stdLibFiles, "-o", destFile],
        "Error linking libraries:",
      );
    }

    return modulesArgs;
  }

  private cleanupTempFiles(): void {
    for (const file of this.tempFiles) {
      try {
        Deno.removeSync(file);
      } catch (e) {
        if (this.debug) {
          console.error(`Error removing temporary file ${file}:`, e);
        }
      }
    }
  }

  public async compile(): Promise<void> {
    const file_ll = this.createTempFile(".ll");
    const file_bc = this.createTempFile(".bc");

    try {
      Deno.writeTextFileSync(file_ll, this.sourceCode);

      this.log("Compiling LLVM IR to bitcode (.bc)...");
      await this.executeCommand(
        "llvm-as",
        [file_ll, "-o", file_bc],
        "Error compiling .ll to .bc:",
      );
      this.log("Bitcode compilation completed.");

      const moduleArgs = await this.compileStdLibs(
        this.instance.stdLibs,
        file_bc,
      );

      this.log("Compiling bitcode to binary...");

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
        "-fomit-frame-pointer",
        "-fstrict-aliasing",
        "-ffast-math",
        "-fno-rtti",
        "-funwind-tables",
        "-g0",
        ...moduleArgs,
      ];
      if (this.target) args.push("-target", this.target);
      if (this.target) this.log("Compiling to target: " + this.target);

      if (this.debug) {
        const test = [
          "-S",
          "-emit-llvm",
          file_bc,
          "-o",
          "debug.ll",
          ...moduleArgs,
        ];

        this.log("Compiling to LLVM IR for debugging...");
        this.log(`Command: clang ${test.join(" ")}`);

        await this.executeCommand(
          "clang",
          test,
          "Error generating llvm-ir:",
        );

        this.log("LLVM IR generation completed. File: debug.ll\n");
      }

      await this.executeCommand(
        "clang",
        args,
        "Error compiling binary:",
      );
      this.log("Binary compilation completed.");

      this.log("Optimizing binary...");
      await this.executeCommand(
        "strip",
        ["--strip-all", this.outputFile],
        "Error optimizing binary:",
      );

      this.log("Upx in action baby...");
      await this.executeCommand(
        "upx",
        [this.outputFile, "--best", "--lzma", "--ultra-brute"],
        "Error optimizing binary with upx:",
      );

      this.log("Compilation successfully completed!");
    } finally {
      this.cleanupTempFiles();
    }
  }
}
