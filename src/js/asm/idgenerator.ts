export class IdGenerator {
  private id = 1;
  next(): number {
    return this.id++;
  }
}
