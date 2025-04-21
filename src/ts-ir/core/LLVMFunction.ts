import { LLVMBasicBlock } from "./LLVMBasicBlock.ts";
import { TempCounter } from "./TempCounter.ts";

export class LLVMFunction {
  public basicBlocks: LLVMBasicBlock[] = [];
  public tempCounter = new TempCounter();

  constructor(
    public name: string,
    public retType: string = "i32",
    public params: { name: string; type: string }[] = [],
  ) {}

  public createBasicBlock(label?: string): LLVMBasicBlock {
    const bb = new LLVMBasicBlock(
      label || `${this.name}_entry`,
      this.tempCounter,
    );
    this.basicBlocks.push(bb);
    return bb;
  }

  public toString(): string {
    const paramsStr = this.params.map((p) => `${p.type} %${p.name}`).join(", ");
    const header = `define ${this.retType} @${this.name}(${paramsStr}) {`;
    const bbStr = this.basicBlocks.map((bb) => bb.toString()).join("\n");
    return `${header}\n${bbStr}\n}`;
  }
}
