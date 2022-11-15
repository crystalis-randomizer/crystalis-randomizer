const esbuild = require('esbuild');
const {promises: fs} = require('fs');
const brotliPlugin = require('esbuild-plugin-brotli');

// TODO - use NODE_ENV to determine whether to minify or sourcemap?

// NOTE: we could easily write a custom 'watch' command that runs this
// on all saves, and also zips/bundles everything, etc...?

const prod = process.env.NODE_ENV === 'production';

async function build(entryPoints, opts) {
  const result = await esbuild.build({
    bundle: true,
    minify: prod,
    sourcemap: prod ? undefined : 'inline',
    outdir: 'dist/js',
    entryPoints: entryPoints.map(s => `src/js/${s}`),
    plugins: [brotliPlugin],
    ...opts,
  });
  for (const err of [...result.errors, ...result.warnings]) {
    console.error(err);
  }
}

async function run() {
  try {
    // Delete all the chunks from dist/js?
    const dir = await fs.opendir('dist/js');
    for await (const entry of dir) {
      if (/^chunk-.*\.js$/.test(entry.name)) {
        await fs.unlink(`dist/js/${entry.name}`);
      }
    }
  } catch (err) {
    // ignore
  }

  try {
    // Run the build
    await Promise.all([
      // Web sources
      build([
        'main.js',
        'check.js',
        'view/maps.js',
        'view/messages.js',
        'view/screens.js',
        'view/sprites.js',
        'view/tileset.js',
      ], {
        splitting: true,
        format: 'esm',
      }),
      build([
        'cli.ts',
        'asm/js65.ts',
      ], {
        platform: 'node',
      }),
    ]);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }  
}

run();
