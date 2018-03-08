const gulp = require('gulp');

const extensions = [
  'json',
  'js',
];

function extensionsGlob() {
  if (extensions.length === 1) {
    return `${global.__buildConfig.src}/**/*.${extensions[0]}`;
  } else {
    return `${global.__buildConfig.src}/**/*.{${extensions.join(',')}}`;
  }
};

function copy() {
  return gulp.src(extensionsGlob()).pipe(gulp.dest(global.__buildConfig.dest));
};

module.exports = {
  build: copy,
  watchGlobs: extensionsGlob()
};
