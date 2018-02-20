const gulp = require('gulp');
const fse = require('fs-extra');

const getTaskFilepaths = require('./utils/get-task-filepaths');

function watch(done) {
  console.log('\n\nWatching for changes....\n\n');
  global.__buildConfig.watching = true;
  const watchTasks = [];
  const taskFiles = getTaskFilepaths();
  for (const taskFilepath of taskFiles) {
    const {watchGlobs, build, task} = require(taskFilepath);
    if (watchGlobs && build) {
      gulp.watch(watchGlobs, build);
    } else if (watchGlobs && task) {
      gulp.watch(watchGlobs, task);
    }
  }
};

module.exports = {
  task: watch,
};
