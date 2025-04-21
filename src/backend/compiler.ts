import { Semantic } from "../middle/semantic.ts";

export class FarpyCompiler {
  constructor(
    private sourceCode: string,
    private outputFile: string,
    private instance: Semantic,
    private debug: boolean = false,
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

  public async compile(): Promise<void> {
    const file_ll = Deno.makeTempFileSync({ suffix: ".ll" });
    const file_bc = Deno.makeTempFileSync({ suffix: ".bc" });
    const opt_file_bc = Deno.makeTempFileSync({ suffix: ".bc" });
    const file_asm = Deno.makeTempFileSync({ suffix: ".s" });

    const stdLibFiles: string[] = [];
    const tempFiles: string[] = [file_ll, file_bc, opt_file_bc, file_asm];

    try {
      Deno.writeTextFileSync(file_ll, this.sourceCode);

      this.log("Compilando o código LLVM IR para bitcode (.bc)...");
      await this.executeCommand(
        "llvm-as",
        [file_ll, "-o", file_bc],
        "Erro ao compilar .ll para .bc:",
      );
      this.log("Compilação para bitcode concluída.");

      const stdLibs = [...this.instance.importedModules];
      if (stdLibs.length > 0) {
        this.log("Compilando bibliotecas padrão...");

        for (const lib of stdLibs) {
          const libFile = Deno.makeTempFileSync({ suffix: ".bc" });
          stdLibFiles.push(libFile);
          tempFiles.push(libFile);

          await this.executeCommand(
            "clang",
            [`./stdlib/${lib}.c`, "-c", "-emit-llvm", "-o", libFile],
            `Erro ao compilar biblioteca ${lib}:`,
          );
        }

        if (stdLibFiles.length > 0) {
          this.log("Vinculando bibliotecas com o código do usuário...");

          await this.executeCommand(
            "llvm-link",
            [file_bc, ...stdLibFiles, "-o", file_bc],
            "Erro ao vincular bibliotecas:",
          );
        }
      }

      // Otimizar bitcode
      this.log("Otimizando bitcode...");
      await this.executeCommand(
        "opt",
        ["-O3", file_bc, "-o", opt_file_bc],
        "Erro ao otimizar bitcode (.bc):",
      );
      this.log("Otimização de bitcode concluída.");

      // Gerar assembly a partir do bitcode
      this.log("Gerando assembly...");
      await this.executeCommand(
        "llc",
        [opt_file_bc, "-o", file_asm],
        "Erro ao gerar assembly (.s):",
      );
      this.log("Geração de assembly concluída.");

      // Compilar assembly para binário
      this.log("Compilando o assembly para binário...");
      await this.executeCommand(
        "clang",
        [file_asm, "-o", this.outputFile],
        "Erro ao compilar o binário:",
      );
      this.log("Compilação para binário concluída.");

      // Otimizar binário (strip)
      this.log("Otimizando binário...");
      await this.executeCommand(
        "strip",
        [this.outputFile],
        "Erro ao otimizar o binário:",
      );
      this.log("Compilação finalizada com sucesso!");
    } finally {
      for (const file of tempFiles) {
        try {
          Deno.removeSync(file);
        } catch (e) {
          if (this.debug) {
            console.error(`Erro ao remover arquivo temporário ${file}:`, e);
          }
        }
      }
    }
  }
}
