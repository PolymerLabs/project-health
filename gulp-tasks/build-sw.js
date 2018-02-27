const path = require('path');
const {buildBrowserTypescript} = require('./utils/build-browser-typescript');

function buildSW() {
  const srcDir = path.join(global.__buildConfig.src, 'sw');
  const tsConfigPath = path.join(srcDir, 'tsconfig.json');
  const destDir = path.join(global.__buildConfig.dest, 'sw');

  return buildBrowserTypescript(srcDir, tsConfigPath, destDir);
};
buildSW.displayName = `build-sw`;

module.exports = {
  build: buildSW,
  watchGlobs: `${global.__buildConfig.src}/sw/**/*.{ts,d.ts}`
}
