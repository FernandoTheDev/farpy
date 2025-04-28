export class TempCounter {
  private count = 0;
  public next(): string {
    return `%${this.count++}`;
  }
}
