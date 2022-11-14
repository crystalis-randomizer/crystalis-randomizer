const esbuild = require('esbuild');
const brotliPlugin = require('esbuild-plugin-brotli');

// TODO - use NODE_ENV to determine whether to minify or sourcemap?

// NOTE: we could easily write a custom 'watch' command that runs this
// on all saves, and also zips/bundles everything, etc...?

const prod = process.env.NODE_ENV === 'production';

esbuild.build({
  bundle: true,
  minify: prod,
  sourcemap: prod ? undefined : 'inline',
  splitting: true,
  format: 'esm',
  outdir: 'dist/js',
  entryPoints: ['main', 'check', 'view/maps', 'view/messages', 'view/screens',
                'view/sprites', 'view/tileset'].map(s => `src/js/${s}.js`),
  plugins: [brotliPlugin],
}).then(result => {
  for (const err of [...result.errors, ...result.warnings]) {
    console.error(err);
  }
  // TODO - print out the data about the output files???
}).catch((e) => {console.error(e); process.exit(1);});
