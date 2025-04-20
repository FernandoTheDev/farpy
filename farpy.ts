/**
 * Farpy - A custom programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { parseArgs } from "jsr:@std/cli";
import { Lexer } from "./src/lexer/lexer.ts";
import { Parser } from "./src/parser/parser.ts";

const parsedArgs = parseArgs(Deno.args, {
  alias: {
    h: "help",
    v: "version",
  },
  boolean: ["help", "version"],
});

const fileName: string = parsedArgs._[0] as string;

if (!fileName) {
  console.error("ERROR: File is expected.");
  Deno.exit(-1);
}

const fileData = Deno.readTextFileSync(fileName);
const tokens = new Lexer(fileName, fileData).tokenize();
const ast = new Parser(tokens).parse();

console.log("AST: ", ast);
