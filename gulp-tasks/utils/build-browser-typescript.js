const gulp = require('gulp');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const rollup = require('rollup');
const rollupStream = require('rollup-stream');
const uglifyPlugin = require('rollup-plugin-uglify');
const typescriptPlugin = require('rollup-plugin-typescript');
const esMinify = require('uglify-es').minify;
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const util = require('util');
const glob = util.promisify(require('glob'));

const processScript = (scriptPath, relativePath, tsConfigPath, destDir) => {
  const tsconfig = require(tsConfigPath);

  return rollupStream({
    rollup,
    input: scriptPath,
    output: {
      format: 'iife',
      sourcemap: true,
      name: path.basename(scriptPath),
    },
    plugins: [
      // The plugin can only read tsconfig from the cwd so instead,
      // we read in the file and set the compiler options directly
      // in the plugin options (hence the `...tsconfig.compilerOptions`)
      // Then `tsconfig: false` disables any tsconfig.json file reading
      typescriptPlugin({
        ...tsconfig.compilerOptions,
        tsconfig: false,
        typescript: require('typescript'),
      }),
      uglifyPlugin({}, esMinify),
    ],
  })
  .pipe(source(relativePath))
  // Convert streaming vinyl files to use buffers.
  // Required to make some of these gulp plugins work.
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(rename({
    extname: '.js',
  }))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(destDir));
};

const buildBrowserTypescript = async (directory, tsConfigPath, destDir) => {
  const scriptFiles = await glob('**/*.ts', {
    cwd: directory,
    absolute: true,
  });

  if (scriptFiles.length === 0) {
    return;
  }

  const scriptFunctions = scriptFiles.map((filePath) => {
    const relativePath = path.relative(
      path.normalize(directory),
      filePath
    );

    const cb = () => processScript(filePath, relativePath, tsConfigPath, destDir);
    cb.displayName = `typescript: ${relativePath}`;
    return cb;
  });

  return new Promise((resolve) => gulp.parallel(scriptFunctions)(resolve));
};

module.exports = {
  buildBrowserTypescript
};