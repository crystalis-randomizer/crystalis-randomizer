export class FetchReader {
    constructor(path = 'js/') {
        this.path = path;
    }
    async read(file) {
        if (file in STATIC)
            return STATIC[file];
        const response = await fetch(this.path + file);
        return await response.text();
    }
}
const STATIC = {};
//# sourceMappingURL=fetchreader.js.map