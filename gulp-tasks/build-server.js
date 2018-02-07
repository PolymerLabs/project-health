const path = require('path');
const {buildTypescript} = require('./utils/build-typescript');

function buildServer() {
  const destDir = global.__buildConfig.dest;
  const tsConfigPath = path.join(global.__buildConfig.src, 'tsconfig.json');
  return buildTypescript(tsConfigPath, destDir);
};
buildServer.displayName = `build-server`;

module.exports = {
  build: buildServer,
  watchGlobs: `${global.__buildConfig.src}/**/*.{ts,d.ts}`
}