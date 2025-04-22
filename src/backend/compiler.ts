import { Semantic } from "../middle/semantic.ts";

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
    stdLibs: string[],
    destFile: string,
  ): Promise<void> {
    if (stdLibs.length === 0) return;

    this.log("Compiling standard libraries...");

    for (const lib of stdLibs) {
      const libFile = this.createTempFile(".bc");
      this.stdLibFiles.push(libFile);

      const args = [`./stdlib/${lib}.c`, "-c", "-emit-llvm", "-o", libFile];
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

      await this.compileStdLibs([...this.instance.importedModules], file_bc);

      this.log("Compiling bitcode to binary...");

      const args = [file_bc, "-O3", "-fPIE", "-o", this.outputFile];
      if (this.target) args.push("-target", this.target);
      if (this.target) this.log("Compiling to target: " + this.target);

      await this.executeCommand(
        "clang",
        args,
        "Error compiling binary:",
      );
      this.log("Binary compilation completed.");

      this.log("Optimizing binary...");
      await this.executeCommand(
        "strip",
        [this.outputFile],
        "Error optimizing binary:",
      );
      this.log("Compilation successfully completed!");
    } finally {
      this.cleanupTempFiles();
    }
  }
}
