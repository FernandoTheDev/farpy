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
2. **Type System**: Performs static type checking with support for primitive types and structures.
3. **IR Generator**: Translates the AST into LLVM IR using an in-house TypeScript library, without any FFI or external bindings.
4. **Optimization & Codegen**: Uses LLVM tools (`llvm-as`, `clang`) to assemble the IR into native object code.
5. **Linking**: Combines object files and C-based standard library modules into a final executable using `clang` and `llvm-link`.
6. **Strip**: Removes symbols and debug information from the binary to reduce its size using the `strip` tool.
7. **UPX**: Compresses the binary to make it smaller and faster to load using the `upx` tool.

## Prerequisites

To build and run the Farpy compiler on Linux:

- [Deno](https://deno.land/) - JavaScript and TypeScript runtime
- [Clang](https://clang.llvm.org/) - C/C++ compiler frontend
- [UPX](https://upx.github.io/) - Ultimate Packer for Executables (to compress the binary)
- LLVM toolchain:
  - `llvm-as` (LLVM assembler)
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
   ./farpy examples/hello.fp --opt --o hello
   ```
5. **Run the generated executable**:
   ```bash
   ./hello
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

- **In Development**: We have already generated optimized and fast binary (faster than many languages ​​out there), we are currently adding features and resources that are not ready yet. Follow the examples folder to see what is already possible to do.

- **Planned**:
  - Support for Windows and macOS platforms.
  - Enhancements to the standard library.
  - Additional compiler optimizations and language features.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
