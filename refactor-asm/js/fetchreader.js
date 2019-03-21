export class FetchReader {
  constructor(path = 'js/') {
    this.path = path;
  }
  async read(file) {
    const response = await fetch(this.path + file);
    return await response.text();
  }
}
