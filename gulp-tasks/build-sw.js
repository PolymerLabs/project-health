const path = require('path');
const {buildTypescript} = require('./utils/build-typescript');

function buildSW() {
  const destDir = path.join(global.__buildConfig.dest, 'sw');
  const tsConfigPath =
      path.join(global.__buildConfig.src, 'sw', 'tsconfig.json');
  return buildTypescript(tsConfigPath, destDir);
};
buildSW.displayName = `build-sw`;

module.exports = {
  build: buildSW,
  watchGlobs: `${global.__buildConfig.src}/sw/**/*.{ts,d.ts}`
}