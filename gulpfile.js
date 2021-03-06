const gulp = require('gulp');
const closure = require('google-closure-compiler').gulp();

const COMMON = [
  '6502.js',
  'assert.js',
  'bits.js',
  'bits_array.js',
  'bits_base.js',
  'bits_bigint.js',
  'crc32.js',
  'asm/*.js',
  'data/*.js',
  'depgraph.js',
  'externs.js',
  'fetchreader.js',
  'flags/*.js',
  'flagset.js',
  'graph.js',
  'logic/*.js',
  'maze/*.js',
  'nodes.js',
  'pass/*.js',
  'patch.js',
  'polyfill.js',
  'random.js',
  'rom.js',
  'romimage.js',
  'rom/*.js',
  'spoiler/*.js',
  'unionfind.js',
  'util.js',
  'version.js',
];

const srcs = (...srcs) => srcs.map(s => './dist/js/' + s);

gulp.task('main', function() {
  return gulp.src(srcs(...COMMON,
                       //'fetchreader.js',
                       'progress.js',
                       'render.js',
                       'main.js'),
                  {base: './dist/js/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        isolation_mode: 'IIFE',
        //output_wrapper: '(function(){\nconst global=window;%output%\n}).call(this)',
        js_output_file: 'main.min.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

gulp.task('check', function() {
  return gulp.src(srcs('check.js'), {base: './dist/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        isolation_mode: 'IIFE',
        //output_wrapper: '(function(){\nconst global=window;%output%\n}).call(this)',
        js_output_file: 'check.min.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

gulp.task('tracker', function() {
  return gulp.src(srcs(...COMMON, 'tracker.js'), {base: './dist/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        isolation_mode: 'IIFE',
        //output_wrapper: '(function(){\nconst global=window;%output%\n}).call(this)',
        js_output_file: 'tracker.min.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

gulp.task('edit', function() {
  return gulp.src(srcs(...COMMON, 'edit/*.js'),
                  {base: './dist/js/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        isolation_mode: 'IIFE',
        //output_wrapper: '(function(){\nconst global=window;%output%\n}).call(this)',
        js_output_file: 'edit.min.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

// TODO - build the modified HTML files here, too?
gulp.task('default', gulp.parallel('main', 'check', 'tracker'));
