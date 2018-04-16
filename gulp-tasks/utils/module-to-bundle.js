const gulp = require('gulp');
const path = require('path');
const fs = require('fs-extra');
const sourcemaps = require('gulp-sourcemaps');
const rollup = require('rollup');
const rollupStream = require('rollup-stream');
const uglifyPlugin = require('rollup-plugin-uglify');
const sourcemapPlugin = require('rollup-plugin-sourcemaps');
const esMinify = require('uglify-es').minify;
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const util = require('util');
const glob = util.promisify(require('glob'));

const processScript = (scriptPath, relativePath, destDir) => {
  return rollupStream({
           rollup,
           input: scriptPath,
           output: {
             format: 'iife',
             sourcemap: true,
             name: path.basename(scriptPath),
           },
           onwarn: (warning) => {
             if (warning.code === 'THIS_IS_UNDEFINED') {
               // This warning occurs when using Rollup with Typescript
               // generated code: https://github.com/rollup/rollup/issues/794
               return;
             }
             console.warn(warning.message);
           },
           plugins: [
             // This module enabled Rollup to *ingest* a sourcemap to apply
             // further manipulations
             sourcemapPlugin(),
             // Minify the bundled JS
             uglifyPlugin({}, esMinify),
           ],
           experimentalDynamicImport: true,
         })
      .pipe(source(relativePath))
      // Convert streaming vinyl files to use buffers.
      // Required to make some of these gulp plugins work.
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('.', {sourceRoot: '../src'}))
      .pipe(gulp.dest(destDir));
};

async function moduleToBundle(directory) {
  const bundledDir = path.join(directory, 'bundled');
  await fs.remove(bundledDir);

  const scriptFiles = await glob('**/*.js', {
    cwd: directory,
    absolute: true,
  });

  if (scriptFiles.length === 0) {
    return;
  }

  const scriptFunctions = scriptFiles.map((filePath) => {
    const relativePath = path.relative(path.normalize(directory), filePath);


    const cb = () => processScript(filePath, relativePath, bundledDir);
    cb.displayName = `moduleToBundle: ${relativePath}`;
    return cb;
  });

  return new Promise((resolve) => {
    gulp.parallel(scriptFunctions)(resolve);
  });
};

module.exports = {moduleToBundle};
