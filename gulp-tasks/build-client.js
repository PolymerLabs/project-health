const path = require('path');
const {buildTypescript} = require('./utils/build-typescript');

function buildClient() {
  const destDir = path.join(global.__buildConfig.dest, 'client')
  const tsConfigPath =
      path.join(global.__buildConfig.src, 'client', 'tsconfig.json');
  return buildTypescript(tsConfigPath, destDir);
};
buildClient.displayName = `build-client`;

module.exports = {
  build: buildClient,
  watchGlobs: `${global.__buildConfig.src}/client/**/*.{ts,d.ts}`
}