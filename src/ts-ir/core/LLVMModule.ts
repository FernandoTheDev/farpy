/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
import { LLVMFunction } from "./LLVMFunction.ts";

export class LLVMModule {
  public globals: string[] = [];
  public externals: string[] = [];
  public functions: LLVMFunction[] = [];

  constructor(public name: string = "module") {}

  public addGlobal(declaration: string): void {
    this.globals.push(declaration);
  }

  public addExternal(declaration: string): void {
    this.externals.push(declaration);
  }

  public addFunction(func: LLVMFunction): void {
    this.functions.push(func);
  }

  public toString(): string {
    const extStr = this.externals.join("\n");
    const globalsStr = this.globals.join("\n");
    const funcsStr = this.functions.map((fn) => fn.toString()).join("\n\n");

    let content = ``;

    if (this.externals.length > 0) {
      content += `; External Declarations\n`;
      content += `${extStr}\n\n`;
    }

    if (this.globals.length > 0) {
      content += `; Global Declarations\n`;
      content += `${globalsStr}\n\n`;
    }

    if (this.functions.length > 0) {
      content += `${funcsStr}`;
    }

    return content;
  }
}
