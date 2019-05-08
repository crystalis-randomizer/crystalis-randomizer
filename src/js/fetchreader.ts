export class FetchReader {
  constructor(readonly path: string = 'js/') {}
  async read(file: string) {
    const response = await fetch(this.path + file);
    return await response.text();
  }
}
