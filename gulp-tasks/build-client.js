const path = require('path');

const {npmRunScript} = require('./utils/npm-run-script');
const {moduleToBundle} = require('./utils/module-to-bundle');

async function buildClient() {
  const destDir = path.join(global.__buildConfig.dest, 'client');

  await npmRunScript('typescript:browser');
  await moduleToBundle(destDir);
};
buildClient.displayName = `build-client`;

module.exports = {
  build: buildClient,
  watchGlobs: [
    `${global.__buildConfig.src}/client/**/*.{ts,d.ts}`,
  ],
}
