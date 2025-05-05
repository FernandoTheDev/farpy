import { LLVMType } from "./ast.ts";

export interface FunctionArg {
  type: string;
  name: string;
  llvmType?: LLVMType;
}

export interface Define {
  name: string;
  value: string;
}

export interface Function {
  name: string;
  returnType: string;
  args: FunctionArg[];
  signature: string;
}

export interface ParseResult {
  includes: string[];
  defines: Define[];
  functions: Function[];
}

export class CParser {
  private sourceWithoutComments: string = "";

  public parseString(sourceCode: string): ParseResult {
    try {
      this.sourceWithoutComments = this.removeComments(sourceCode);

      const includes = this.extractIncludes();
      const defines = this.extractDefines();
      const functions = this.extractFunctions();

      return { includes, defines, functions };
    } catch (error: any) {
      console.error(`Erro ao analisar o código: ${error.message}`);
      return { includes: [], defines: [], functions: [] };
    }
  }

  private removeComments(source: string): string {
    let result = source.replace(/\/\*[\s\S]*?\*\//g, "");
    result = result.replace(/\/\/.*$/gm, "");

    return result;
  }

  private extractIncludes(): string[] {
    const includeRegex = /#include\s+[<"]([^">]+)[">]/g;
    const includes: string[] = [];

    let match;
    while ((match = includeRegex.exec(this.sourceWithoutComments)) !== null) {
      includes.push(match[1]);
    }

    return includes;
  }

  private extractDefines(): Define[] {
    const defineRegex = /#define\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)/g;
    const defines: Define[] = [];

    let match;
    while ((match = defineRegex.exec(this.sourceWithoutComments)) !== null) {
      defines.push({
        name: match[1],
        value: match[2].trim().replace(/\/\/.*$/, "").trim(), // Remove comentários inline
      });
    }

    return defines;
  }

  private parseArgs(argsStr: string): FunctionArg[] {
    if (!argsStr.trim()) return [];

    return argsStr.split(",").map((arg) => {
      const trimmed = arg.trim();
      if (trimmed === "void") return { type: "void", name: "" };

      const parts = trimmed.split(/\s+/);
      const name = parts.pop() || "";

      const asterisks = (name.match(/^\*+/) || [""])[0];
      const cleanName = name.replace(/^\*+/, "");
      const type = parts.join(" ") + (asterisks ? " " + asterisks : "");

      return { type, name: cleanName };
    });
  }

  private extractFunctions(): Function[] {
    const funcRegex =
      /([a-zA-Z_][a-zA-Z0-9_*\s]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:{|;)/g;
    const functions: Function[] = [];

    let match;
    while ((match = funcRegex.exec(this.sourceWithoutComments)) !== null) {
      const returnType = match[1].trim();
      const name = match[2].trim();
      const argsStr = match[3];
      const args = this.parseArgs(argsStr);

      if (match[0].trim().endsWith(";")) continue;
      const signature = `${returnType} ${name}(${argsStr})`;
      functions.push({ name, returnType, args, signature });
    }

    return functions;
  }
}
