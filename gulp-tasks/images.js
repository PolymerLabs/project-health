const gulp = require('gulp');
const imagemin = require('gulp-imagemin');

const extensions = [
  'jpeg',
  'jpg',
  'png',
  'gif',
  'svg',
  'ico',
];

function images() {
  return gulp.src(`${global.__buildConfig.src}/**/*.{${extensions.join(',')}}`)
      .pipe(imagemin([
        imagemin.gifsicle(),
        imagemin.svgo(),
      ]))
      .pipe(gulp.dest(global.__buildConfig.dest));
};

module.exports = {
  build: images,
  watchGlobs: `${global.__buildConfig.src}/**/*.{${extensions.join(',')}}`
};
