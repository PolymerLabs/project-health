const path = require('path');
const {buildBrowserTypescript} = require('./utils/build-browser-typescript');

function buildClient() {
  const srcDir = path.join(global.__buildConfig.src, 'client');
  const tsConfigPath = path.join(srcDir, 'tsconfig.json');
  const destDir = path.join(global.__buildConfig.dest, 'client');

  return buildBrowserTypescript(srcDir, tsConfigPath, destDir);
};
buildClient.displayName = `build-client`;

module.exports = {
  build: buildClient,
  watchGlobs: `${global.__buildConfig.src}/client/**/*.{ts,d.ts}`
}