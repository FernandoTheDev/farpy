import { LLVMBasicBlock } from "./LLVMBasicBlock.ts";
import { TempCounter } from "./TempCounter.ts";

export class LLVMFunction {
  public basicBlocks: LLVMBasicBlock[] = [];
  public tempCounter: TempCounter = new TempCounter();
  public blockCounter: number = 0;
  public currentBlock: LLVMBasicBlock | null = null;

  constructor(
    public name: string,
    public retType: string = "i32",
    public params: { name: string; type: string }[] = [],
  ) {}

  nextTemp(): string {
    return this.tempCounter.next();
  }

  nextBlockId(): number {
    return this.blockCounter++;
  }

  public setCurrentBasicBlock(block: LLVMBasicBlock): void {
    this.currentBlock = block;
  }

  public getCurrentBasicBlock(): LLVMBasicBlock {
    if (!this.currentBlock) {
      this.currentBlock = this.createBasicBlock();
    }
    return this.currentBlock;
  }

  public createBasicBlock(label?: string): LLVMBasicBlock {
    const bb = new LLVMBasicBlock(
      label || `${this.name}_entry`,
      this,
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
