'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify-es').default;
var rename = require('gulp-rename')
var sourcemaps = require('gulp-sourcemaps');
var log = require('gulplog');

gulp.task('minify', function () {
    // set up the browserify instance on a task basis
    var b = browserify({
      entries: './dist/index.js',
      standalone: 'SuperTimeline',
      debug: true
    });
  
    return b.bundle()
      .pipe(source('app.js'))
      .pipe(rename("timeline.min.js"))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
          // Add transformation tasks to the pipeline here.
          .pipe(uglify())
          .on('error', log.error)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/js/'));
  });

  gulp.task('bundle', function () {
    // set up the browserify instance on a task basis
    var b = browserify({
      entries: './dist/index.js',
      standalone: 'SuperTimeline',
      debug: true
    });
  
    return b.bundle()
      .pipe(source('app.js'))
      .pipe(rename("timeline.js"))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
          // Add transformation tasks to the pipeline here.
          // .pipe(uglify())
          .on('error', log.error)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/js/'));
  });
