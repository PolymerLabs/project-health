const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');

function buildTypescript(tsConfigPath, destPath) {
  const tsProject = ts.createProject(tsConfigPath);
  const tsResult = tsProject.src().pipe(tsProject())
    .on('error', (err) => {
      if (global.__buildConfig.watching) {
        // Don't exit if we are watching - future changes may fix the error.
        return;
      }

      console.error(err.message);
      process.exit(1);
    });

  return tsResult.js.pipe(gulp.dest(destPath + '/'));
};

module.exports = {
  buildTypescript,
};
