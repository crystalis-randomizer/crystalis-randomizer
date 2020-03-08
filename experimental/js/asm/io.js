import { Token } from './token.js';
import { Tokenizer } from './tokenizer.js';
export class IncludeWrapper {
    constructor(readFile, source, stream, opts) {
        this.readFile = readFile;
        this.source = source;
        this.stream = stream;
        this.opts = opts;
    }
    async nextAsync() {
        var _a;
        while (true) {
            const line = this.source.next();
            if (((_a = line) === null || _a === void 0 ? void 0 : _a[0].token) !== 'cs')
                return line;
            if (line[0].str !== '.include')
                return line;
            const path = str(line);
            const code = await this.readFile(path);
            this.stream.enter(new Tokenizer(code, path, this.opts));
        }
    }
}
export class ConsoleWrapper {
    constructor(source) {
        this.source = source;
    }
    next() {
        var _a;
        while (true) {
            const line = this.source.next();
            if (((_a = line) === null || _a === void 0 ? void 0 : _a[0].token) !== 'cs')
                return line;
            switch (line[0].str) {
                case '.out':
                    console.log(str(line));
                    break;
                case '.warning':
                    console.warn(str(line));
                    break;
                case '.error':
                    err(line);
                    break;
                default:
                    return line;
            }
        }
    }
}
function err(line) {
    const msg = str(line);
    throw new Error(msg + Token.at(line[0]));
}
function str(line) {
    const str = Token.expectString(line[1], line[0]);
    Token.expectEol(line[2], 'a single string');
    return str;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvYXNtL2lvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDOUMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR3pDLE1BQU0sT0FBTyxjQUFjO0lBQ3pCLFlBQ2EsUUFBMkMsRUFDM0MsTUFBbUIsRUFBVyxNQUFtQixFQUNqRCxJQUF3QjtRQUZ4QixhQUFRLEdBQVIsUUFBUSxDQUFtQztRQUMzQyxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNqRCxTQUFJLEdBQUosSUFBSSxDQUFvQjtJQUFHLENBQUM7SUFFekMsS0FBSyxDQUFDLFNBQVM7O1FBQ2IsT0FBTyxJQUFJLEVBQUU7WUFDWCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLElBQUksT0FBQSxJQUFJLDBDQUFHLENBQUMsRUFBRSxLQUFLLE1BQUssSUFBSTtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUMxQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssVUFBVTtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUM1QyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXZDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDekQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUN6QixZQUFxQixNQUFtQjtRQUFuQixXQUFNLEdBQU4sTUFBTSxDQUFhO0lBQUcsQ0FBQztJQUU1QyxJQUFJOztRQUNGLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE9BQUEsSUFBSSwwQ0FBRyxDQUFDLEVBQUUsS0FBSyxNQUFLLElBQUk7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFDMUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO2dCQUNuQixLQUFLLE1BQU07b0JBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDdkIsTUFBTTtnQkFDUixLQUFLLFVBQVU7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTTtnQkFDUixLQUFLLFFBQVE7b0JBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNWLE1BQU07Z0JBQ1I7b0JBQ0UsT0FBTyxJQUFJLENBQUM7YUFDZjtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxHQUFHLENBQUMsSUFBYTtJQUN4QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxJQUFhO0lBQ3hCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDNUMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtUb2tlbiwgVG9rZW5Tb3VyY2V9IGZyb20gJy4vdG9rZW4uanMnO1xuaW1wb3J0IHtUb2tlbml6ZXJ9IGZyb20gJy4vdG9rZW5pemVyLmpzJztcbmltcG9ydCB7VG9rZW5TdHJlYW19IGZyb20gJy4vdG9rZW5zdHJlYW0uanMnO1xuXG5leHBvcnQgY2xhc3MgSW5jbHVkZVdyYXBwZXIgaW1wbGVtZW50cyBUb2tlblNvdXJjZS5Bc3luYyB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVhZEZpbGU6IChwYXRoOiBzdHJpbmcpID0+IFByb21pc2U8c3RyaW5nPixcbiAgICAgIHJlYWRvbmx5IHNvdXJjZTogVG9rZW5Tb3VyY2UsIHJlYWRvbmx5IHN0cmVhbTogVG9rZW5TdHJlYW0sXG4gICAgICByZWFkb25seSBvcHRzPzogVG9rZW5pemVyLk9wdGlvbnMpIHt9XG5cbiAgYXN5bmMgbmV4dEFzeW5jKCk6IFByb21pc2U8VG9rZW5bXXx1bmRlZmluZWQ+IHtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgbGluZSA9IHRoaXMuc291cmNlLm5leHQoKTtcbiAgICAgIGlmIChsaW5lPy5bMF0udG9rZW4gIT09ICdjcycpIHJldHVybiBsaW5lO1xuICAgICAgaWYgKGxpbmVbMF0uc3RyICE9PSAnLmluY2x1ZGUnKSByZXR1cm4gbGluZTtcbiAgICAgIGNvbnN0IHBhdGggPSBzdHIobGluZSk7XG4gICAgICBjb25zdCBjb2RlID0gYXdhaXQgdGhpcy5yZWFkRmlsZShwYXRoKTtcbiAgICAgIC8vIFRPRE8gLSBvcHRpb25zP1xuICAgICAgdGhpcy5zdHJlYW0uZW50ZXIobmV3IFRva2VuaXplcihjb2RlLCBwYXRoLCB0aGlzLm9wdHMpKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbnNvbGVXcmFwcGVyIGltcGxlbWVudHMgVG9rZW5Tb3VyY2Uge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBzb3VyY2U6IFRva2VuU291cmNlKSB7fVxuXG4gIG5leHQoKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IGxpbmUgPSB0aGlzLnNvdXJjZS5uZXh0KCk7XG4gICAgICBpZiAobGluZT8uWzBdLnRva2VuICE9PSAnY3MnKSByZXR1cm4gbGluZTtcbiAgICAgIHN3aXRjaCAobGluZVswXS5zdHIpIHtcbiAgICAgICAgY2FzZSAnLm91dCc6XG4gICAgICAgICAgY29uc29sZS5sb2coc3RyKGxpbmUpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnLndhcm5pbmcnOlxuICAgICAgICAgIGNvbnNvbGUud2FybihzdHIobGluZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcuZXJyb3InOlxuICAgICAgICAgIGVycihsaW5lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gbGluZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXJyKGxpbmU6IFRva2VuW10pOiBuZXZlciB7XG4gIGNvbnN0IG1zZyA9IHN0cihsaW5lKTtcbiAgdGhyb3cgbmV3IEVycm9yKG1zZyArIFRva2VuLmF0KGxpbmVbMF0pKTtcbn1cblxuZnVuY3Rpb24gc3RyKGxpbmU6IFRva2VuW10pOiBzdHJpbmcge1xuICBjb25zdCBzdHIgPSBUb2tlbi5leHBlY3RTdHJpbmcobGluZVsxXSwgbGluZVswXSk7XG4gIFRva2VuLmV4cGVjdEVvbChsaW5lWzJdLCAnYSBzaW5nbGUgc3RyaW5nJyk7XG4gIHJldHVybiBzdHI7XG59XG4iXX0=