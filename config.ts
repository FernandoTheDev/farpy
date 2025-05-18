const ARG_CONFIG = {
  alias: {
    h: "help",
    v: "version",
    astj: "ast-json",
    astjs: "ast-json-save",
    o: "output",
    eir: "emit-llvm-ir",
    opt: "optimize",
    dc: "dead-code",
    cli: "repl",
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
    "dead-code",
    "repl",
  ],
  string: ["ast-json-save", "output", "target"],
  default: { "ast-json-save": "ast.json", "output": "a.out" },
};

const VERSION = "0.0.3";

const TARGET_HELP_MESSAGE = `Farpy Compiler - Target Architecture Help

Supports the following target architectures:
     x86_64-linux-gnu              - 64-bit x86, Linux
     i386-linux-gnu                - 32-bit x86, Linux
     aarch64-linux-gnu             - ARM 64-bit, Linux
     arm-linux-gnueabi             - ARM 32-bit (EABI), Linux
     armv7-linux-gnueabihf         - ARM 32-bit (hard-float ABI), Linux`;

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
  --targeth               Show target architecture help
  --repl, --cli           Open the compiled repl mode`;

export { ARG_CONFIG, HELP_MESSAGE, TARGET_HELP_MESSAGE, VERSION };
