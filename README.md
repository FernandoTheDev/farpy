<p align="center">
  <img src="assets/logo.png" width="150" alt="farpy logo"/>
</p>

# Farpy Compiler

Farpy is a statically-typed, compiled programming language designed for performance, safety, and simplicity. Written entirely in TypeScript, Farpy generates a lean and highly optimized binary without relying on external dependencies. Its standard library is implemented in C to maximize execution speed and maintain a compact footprint.

## Key Features

- **Compiled Language**: Converts high-level Farpy code directly into native machine code through manual LLVM IR generation.
- **Manual IR Generation**: All LLVM IR is produced by a custom TypeScript library, avoiding FFI or external APIs.
- **Lightweight Binaries**: Generated executables are small and optimized for fast startup and runtime performance.
- **No External Dependencies**: Built from the ground up to ensure full control over security and quality.
- **Native Standard Library**: Core libraries written in C to leverage proven performance optimizations.

## Architecture

1. **Frontend**: Parses Farpy source files using a custom parser in TypeScript and builds an abstract syntax tree (AST).
2. **Type System**: Performs static type checking with support for primitive types.
3. **IR Generator**: Translates the AST into LLVM IR using an in-house TypeScript library, without any FFI or external bindings.
4. **Optimization & Codegen**: Leverages LLVM tools (`opt`, `llvm-as`, `llc`) to optimize and assemble the IR into native object code.
5. **Linking**: Combines object files and C-based standard library modules into a final executable using `clang` and `llvm-link`.

## Prerequisites

To build and run the Farpy compiler on Linux:

- [Deno](https://deno.land/) - JavaScript and TypeScript runtime
- [Clang](https://clang.llvm.org/) - C/C++ compiler frontend
- LLVM toolchain:
  - `llvm-as` (LLVM assembler)
  - `llc` (LLVM static compiler)
  - `opt` (LLVM optimizer)
  - `llvm-link` (IR linker)
  - `strip` (symbol stripper)

Ensure that all tools are available in your system `PATH`.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/fernandothedev/farpy.git
   cd farpy
   ```
2. **Install dependencies**:
   ```bash
   deno cache farpy.ts
   ```
3. **Build the compiler**:
   ```bash
   deno task compile
   ```
4. **Compile a Farpy program**:
   ```bash
   ./farpy examples/hello.fp
   ```
5. **Run the generated executable**:
   ```bash
   ./a.out
   ```
6. **See how to use compiler flags**
   ```bash
   ./farpy --h
   ```

## Contributing

Farpy is under active development. Contributions are welcome:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear messages.
4. Open a pull request against the `main` branch.

Please ensure your code follows the existing style and includes tests for new functionality.

## Project Status

- **In Development**: The compiler core and IR generator are functional, but the binary is not yet self-contained.
- **Planned**:
  - Support for Windows and macOS platforms.
  - Enhancements to the standard library.
  - Additional compiler optimizations and language features.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
