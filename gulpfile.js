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

gulp.task('main', function() {
  return gulp.src(srcs(...COMMON, 'progress.js', 'main.js'), {base: './src/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        output_wrapper: '(function(){\n%output%\n}).call(this)',
        js_output_file: 'main.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

gulp.task('check', function() {
  return gulp.src(srcs('check.js'), {base: './src/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        output_wrapper: '(function(){\n%output%\n}).call(this)',
        js_output_file: 'check.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

gulp.task('tracker', function() {
  return gulp.src(srcs(...COMMON, 'tracker.js'), {base: './src/'})
      .pipe(closure({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT_2018',
        language_out: 'ECMASCRIPT6_STRICT',
        output_wrapper: '(function(){\n%output%\n}).call(this)',
        js_output_file: 'tracker.js',
        module_resolution: 'WEBPACK',
      }, {
        platform: ['native', 'java', 'javascript'],
      }))
      .pipe(gulp.dest('./dist'));
});

// TODO - build the modified HTML files here, too?
gulp.task('default', gulp.parallel('main', 'check', 'tracker'));
