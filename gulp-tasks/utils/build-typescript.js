const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');


function buildTypescript(tsConfigPath, destPath) {
  const tsProject = ts.createProject(tsConfigPath);
  const errorMessages = [];
  const tsResult = tsProject.src()
                       .pipe(sourcemaps.init())
                       .pipe(tsProject())
                       .on('error', (err) => {
                         if (global.__buildConfig.watching) {
                           // Don't exit if we are watching - future changes may
                           // fix the error.
                           return;
                         }

                         console.error(err.message);
                         process.exit(1);
                       });

  return tsResult.js.pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(destPath + '/'));
};

module.exports = {
  buildTypescript,
};
