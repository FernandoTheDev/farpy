/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { VERSION } from "../config.ts";
import { FarpyCompilerMain } from "../farpy.ts";

export async function repl(): Promise<void> {
  let code: string[] = [];
  let compiled = false;
  const history: string[] = [];

  const file = "repl.fp";
  const binary = file.replace(".fp", "");

  Deno.writeFileSync(file, new TextEncoder().encode(""));

  const helpMessage = `Farpy REPL Commands:
.       - Run the compiled binary
;       - Compile the current code
clb     - Clear code buffer
cll     - Clear last line of code
swb     - Show code buffer
hist    - Show command history
help    - Show this help message
q/quit  - Exit the REPL
`;

  console.log(`Farpy ${VERSION} - REPL started. Type 'help' for commands.`);

  while (true) {
    const temp_code = prompt("farpy> ");

    if (!temp_code || temp_code.trim() === "") {
      continue;
    }

    if (!["hist", "swb"].includes(temp_code)) {
      history.push(temp_code);
    }

    if (temp_code === "help") {
      console.log(helpMessage);
      continue;
    }

    if (temp_code === "hist") {
      if (history.length === 0) {
        console.log("No command history.");
      } else {
        console.log("Command history:");
        history.forEach((cmd, i) => console.log(`${i + 1}: ${cmd}`));
      }
      continue;
    }

    if (temp_code === ".") {
      if (!compiled) {
        console.log("There is no compiled binary to run.");
        continue;
      }

      try {
        const command = new Deno.Command(`./${binary}`);
        const { code: exitCode, stdout, stderr } = await command.output();

        if (exitCode !== 0) {
          console.log(`Error: ${new TextDecoder().decode(stderr)}`);
          continue;
        }

        console.log(new TextDecoder().decode(stdout));
      } catch (error: any) {
        console.log(`Execution error: ${error.message}`);
      }
      continue;
    }

    if (temp_code === ";") {
      if (code.length === 0) {
        console.log("No code to compile.");
        continue;
      }

      try {
        Deno.writeTextFileSync(file, code.join("\n"));

        console.log("Starting compilation...");
        const compiler = new FarpyCompilerMain([file, "--o", binary]);
        await compiler.run();

        compiled = true;
        console.log("Code compiled successfully. Run with '.'");
      } catch (error: any) {
        console.log(`Compilation error: ${error.message}`);
      }
      continue;
    }

    if (temp_code === "clb") {
      code = [];
      console.log("Code buffer cleared.");
      continue;
    }

    if (temp_code === "cll") {
      if (code.length > 0) {
        const removed = code.pop();
        console.log(`Line removed: ${removed!.trim()}`);
      } else {
        console.log("Buffer is already empty.");
      }
      continue;
    }

    if (temp_code === "swb") {
      if (code.length === 0) {
        console.log("Code buffer is empty.");
      } else {
        console.log("Current code buffer:");
        console.log("----------------");
        console.log(code.join(""));
        console.log("----------------");
      }
      continue;
    }

    if (temp_code === "q" || temp_code === "quit" || temp_code === "sair") {
      console.log("Exiting Farpy REPL. Bye bye!");
      break;
    }

    code.push(temp_code.endsWith("\n") ? temp_code : `${temp_code}\n`);
    console.log("Line added to buffer.");
  }

  // Cleanup files when exiting
  try {
    if (Deno.statSync(file).isFile) {
      Deno.removeSync(file);
    }

    if (compiled && Deno.statSync(binary).isFile) {
      Deno.removeSync(binary);
    }
  } catch (_error) {
    // File might not exist, that's okay
  }

  console.log("Files cleaned up.");
}
