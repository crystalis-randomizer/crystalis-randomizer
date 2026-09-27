# Build Instructions

You will need [Bun](https://bun.sh) installed and on your path.

```
bun install        # get packages
bun run build      # build the web site and CLI into target/
```

| Command              | Does                                                   |
| -------------------- | ------------------------------------------------------ |
| `bun run dev`        | Dev server with hot reload for all pages               |
| `bun run build`      | `build:web` and `build:cli`                            |
| `bun run build:web`  | Bundle the site into `target/web`                      |
| `bun run build:cli`  | Bundle `cryr` into `target/cli` (for npm)              |
| `bun test`           | Unit tests                                             |
| `bun run typecheck`  | Type check sources and tests                           |
| `bun run test`       | Full test suite including the CLI tests                |

Sources can also be run directly, e.g. `bun src/js/cli.ts --help`.
