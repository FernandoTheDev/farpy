const ARG_CONFIG = {
  alias: {
    h: "help",
    v: "version",
    ast: "emit-ast",
    o: "output",
    eir: "emit-ir",
    opt: "optimize",
    dc: "dead-code",
    cli: "repl",
  },
  boolean: [
    "help",
    "version",
    "debug",
    "emit-ast",
    "emit-ir",
    "targeth",
    "optmize",
    "g",
    "dead-code",
    "repl",
  ],
  string: ["output", "target"],
  default: { "output": "a.out" },
};

const VERSION = "0.0.3";

const TARGET_HELP_MESSAGE = `Farpy Compiler - Target Architecture Help

Supports the following target architectures:
     x86_64-linux-gnu              - 64-bit x86, Linux
     i386-linux-gnu                - 32-bit x86, Linux`;
//  aarch64-linux-gnu             - ARM 64-bit, Linux
//  arm-linux-gnueabi             - ARM 32-bit (EABI), Linux
//  armv7-linux-gnueabihf         - ARM 32-bit (hard-float ABI), Linux

const HELP_MESSAGE = `Farpy Compiler ${VERSION}

USAGE:
  farpy [OPTIONS] <FILE>

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Display version information
  --emit-ast              Output AST as JSON and exit (default: ast.json)
  --emit-ir               Output LLVM IR and exit
  -o, --output=<file>     Specify output file name (default: a.out)
  --opt, --optimize       Enable optimization in AST
  --debug                 Enable debug mode
  --target=<target>       Specify target architecture (default: your architecture)
  --targeth               Show target architecture help
  --repl, --cli           Open the compiled repl mode`;

export { ARG_CONFIG, HELP_MESSAGE, TARGET_HELP_MESSAGE, VERSION };
