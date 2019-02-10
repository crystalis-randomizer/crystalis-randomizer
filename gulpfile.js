const gulp = require('gulp');
const closure = require('google-closure-compiler').gulp();

const COMMON = [
  '6502.js',
  'depgraph2.js',
  'graph2.js',
  'random.js',
  'crc32.js',
  'flagset.js',
  'view/rom.js',
  'patch.js',
];

const srcs = (...srcs) => srcs.map(s => './src/' + s);

gulp.task('default', function() {
  return gulp.src(srcs(...COMMON, 'progress.js', 'main.js'), {base: './src/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        output_wrapper: '(function(){\n%output%\n}).call(this)',
        js_output_file: 'main.min.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});
