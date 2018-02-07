const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');

function html() {
  return gulp.src(`${global.__buildConfig.src}/**/*.html`)
      .pipe(htmlmin({
        html5: true,
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        sortAttributes: true,
        sortClassName: true,
      }))
      .pipe(gulp.dest(global.__buildConfig.dest));
};

module.exports = {
  build: html,
  watchGlobs: `${global.__buildConfig.src}/**/*.html`
};
