/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { assertEquals } from "jsr:@std/assert";
import { FarpyCompilerMain } from "../farpy.ts";

function createFreshCompiler(args: string[]) {
  return new FarpyCompilerMain(args);
}

Deno.test({
  name: "calc.fp",
  fn: async () => {
    const outputPath = "tests/test_calc";
    const compiler = createFreshCompiler([
      "examples/calc.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "Result of complex calc: -0.947058\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "fib.fp",
  fn: async () => {
    const outputPath = "tests/test_fib";
    const compiler = createFreshCompiler([
      "examples/fib.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "55\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "c.fp",
  fn: async () => {
    const outputPath = "tests/test_c";
    const compiler = createFreshCompiler([
      "examples/c.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      " v = -1\n w = 0\n z = 2\n y = 1\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "fibonacci.fp",
  fn: async () => {
    const outputPath = "tests/test_fibonacci";
    const compiler = createFreshCompiler([
      "examples/fibonacci.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "102334155\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "complex_calc.fp",
  fn: async () => {
    const outputPath = "tests/test_complex_calc";
    const compiler = createFreshCompiler([
      "examples/complex_calc.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "Result of complex calc: 457.152929\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "convert_type.fp",
  fn: async () => {
    const outputPath = "tests/test_convert_type";
    const compiler = createFreshCompiler([
      "examples/convert_type.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "1.000000\n1.071773\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "ffi_c.fp",
  fn: async () => {
    const outputPath = "tests/test_ffi_c";
    const compiler = createFreshCompiler([
      "examples/ffi_c.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "C: Hello\nCalc = 69\nHello Fernando\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "if.fp",
  fn: async () => {
    const outputPath = "tests/test_if";
    const compiler = createFreshCompiler([
      "examples/if.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "Before if\noi\nAfter if\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});

Deno.test({
  name: "test.fp",
  fn: async () => {
    const outputPath = "tests/test_test";
    const compiler = createFreshCompiler([
      "examples/test.fp",
      "--opt",
      "--o",
      outputPath,
    ]);

    await compiler.run();
    const runCmd = new Deno.Command(outputPath, {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await runCmd.output();
    const outText = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(
        `Execução falhou (exit code ${code}):\n${errText}`,
      );
    }

    assertEquals(
      outText,
      "1\n",
      "A saída do programa não corresponde ao valor esperado",
    );

    await Deno.remove(outputPath);
  },
});
