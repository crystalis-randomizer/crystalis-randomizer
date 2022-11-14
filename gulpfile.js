const gulp = require('gulp');
const through2 = require('through2');

/**
 * `buildchr` will convert the files in `./patches/chr/*.chr` and
 * output a single `.ts` file for each `.chr` file. This ts file
 * contains a declaration for an ASCII representation of the tiles,
 * which can be used in the randomizer code to update a tile.
 *
 * This task is not part of any other pipeline, it is intended to be
 * used as a one-off task, and the output is intended to be copy-pasted
 * into the other source files as needed.
 */
gulp.task('buildchr', function() {
  return gulp.src('./patches/chr/*.chr')
      .pipe(through2.obj((file, _, cb) => {
        let out = '';
        if (file.isBuffer()) {
          let start = 0;
          while (start * 0x10 < file.contents.length) {
            let data = file.contents.slice(start * 0x10, start * 0x10 + 0x10);
            let arr = new Array(64).fill(0);
            for (let x = 0; x < 8; ++x) {
              for (let y = 0; y < 8; ++y) {
                arr[x + y * 8] |= (data[y | 8] >> (~x & 7) & 1) << 1 | (data[y] >> (~x & 7) & 1);
              }
            }
            let concatted = arr
              .map((num) => { switch (num) {
                default:
                case 0: return ' '
                case 1: return 'x'
                case 2: return '.'
                case 3: return 'o'
              }})
              .join('')
              .match(/.{1,8}/g)
              .join('\n  ');
            const tile_as_hex = Number(start).toString(16).padStart(2, '0')
            out += `public static readonly ${file.stem}_tile${tile_as_hex} = parsePattern(\`\n  ${concatted}\n\`);\n`;
            ++start;
          }
        }
        file.contents = Buffer.from(out, 'utf8');
        file.basename = file.stem + ".ts";
        cb(null, file);
      }))
      .pipe(gulp.dest('./patches/chr/'));
});
