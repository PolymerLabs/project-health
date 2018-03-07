const {npmRunScript} = require('./utils/npm-run-script');

async function buildServer() {
  await npmRunScript('typescript:node');
};
buildServer.displayName = `build-server`;

module.exports = {
  build: buildServer,
  watchGlobs: [
    `${global.__buildConfig.src}/{cli,server,test,types,utils}/**/*.{ts,d.ts}`,
    `${global.__buildConfig.src}/*.{ts,d.ts}`
  ],
}
