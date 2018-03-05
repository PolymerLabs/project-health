const gulp = require('gulp');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const rollup = require('rollup');
const rollupStream = require('rollup-stream');
const uglifyPlugin = require('rollup-plugin-uglify');
const esMinify = require('uglify-es').minify;
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const util = require('util');
const glob = util.promisify(require('glob'));

const {buildTypescript} = require('./build-typescript');

const processScript = (scriptPath, relativePath, destDir) => {
  return rollupStream({
           rollup,
           input: scriptPath,
           output: {
             format: 'iife',
             sourcemap: true,
             name: path.basename(scriptPath),
           },
           plugins: [
             // uglifyPlugin({}, esMinify),
           ],
         })
      .pipe(source(relativePath))
      // Convert streaming vinyl files to use buffers.
      // Required to make some of these gulp plugins work.
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(destDir));
};

const buildBrowserTypescript = async (directory, tsConfigPath, destDir) => {
  const taskFunc = () => buildTypescript(tsConfigPath, destDir);
  return new Promise((resolve) => gulp.series(taskFunc)(resolve))
      .then(async () => {
        const scriptFiles = await glob('**/*.js', {
          cwd: destDir,
          absolute: true,
        });

        if (scriptFiles.length === 0) {
          return;
        }

        const scriptFunctions = scriptFiles.map((filePath) => {
          const relativePath = path.relative(path.normalize(destDir), filePath);

          const cb = () => processScript(filePath, relativePath, destDir);
          cb.displayName = `typescript(browser): ${relativePath}`;
          return cb;
        });

        return new Promise((resolve) => {
          gulp.parallel(scriptFunctions)(resolve);
        });
      });
};

module.exports = {buildBrowserTypescript};
