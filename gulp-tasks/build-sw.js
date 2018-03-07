const path = require('path');

const {npmRunScript} = require('./utils/npm-run-script');
const {moduleToBundle} = require('./utils/module-to-bundle');

async function buildSW() {
  const destDir = path.join(global.__buildConfig.dest, 'sw');

  await npmRunScript('typescript:sw');
  await moduleToBundle(destDir);
};
buildSW.displayName = `build-sw`;

module.exports = {
  build: buildSW,
  watchGlobs: [
    `${global.__buildConfig.src}/sw/**/*.{ts,d.ts}`,
  ],
}
