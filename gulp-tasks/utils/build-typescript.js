const gulp = require('gulp');
const ts = require('gulp-typescript');
const path = require('path');

function buildTypescript(tsConfigPath, destPath) {
  const tsProject = ts.createProject(tsConfigPath);
  const tsResult = tsProject.src().pipe(tsProject());

  return tsResult.js.pipe(gulp.dest(destPath + '/'));
};

module.exports = {
  buildTypescript,
};
