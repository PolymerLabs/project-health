const gulp = require('gulp');
const fse = require('fs-extra');

const getTaskFilepaths = require('./utils/get-task-filepaths');
const {npmRunScript} = require('./utils/npm-run-script');

function cleanDestDir() {
  return fse.remove(global.__buildConfig.dest);
};
cleanDestDir.displayName = 'build-clean';

function genGQLTypes() {
  return npmRunScript('generate-gql-types');
};
genGQLTypes.displayName = 'gen-gql-types';

function build(done) {
  const buildTasks = [];
  const taskFiles = getTaskFilepaths();
  for (const taskFilepath of taskFiles) {
    const {build} = require(taskFilepath);
    if (build) {
      buildTasks.push(build);
    }
  }

  return gulp.series([
    cleanDestDir,
    genGQLTypes,
    gulp.parallel(buildTasks),
  ])(done);
};

module.exports = {
  task: build,
};
