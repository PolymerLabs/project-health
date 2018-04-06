const gulp = require('gulp');

// Allows streaming and applying plugins to CSS
const postcss = require('gulp-postcss');
// Inlines CSS @imports()
const cssimport = require('postcss-import');
// Adds backwards compat CSS where possible (i.e. inline CSS vars)
const cssnext = require('postcss-cssnext');
// minifies the final CSS
const cssnano = require('cssnano');

function css() {
  return gulp.src(`${global.__buildConfig.src}/**/*.css`)
      .pipe(postcss([
        cssimport(),
        cssnext({
          features: {
            customProperties: {
              // Allows both fallback and CSS variables to be used
              preserve: true,
              warnings: false,
            }
          }
        }),
        cssnano({
          autoprefixer: false,
        }),
      ]))
      .pipe(gulp.dest(global.__buildConfig.dest));
};

module.exports = {
  build: css,
  watchGlobs: `${global.__buildConfig.src}/**/*.css`
};
