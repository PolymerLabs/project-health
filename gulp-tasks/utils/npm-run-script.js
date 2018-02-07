const path = require('path');
const spawn = require('./spawn-promise');

function npmRunScript(scriptName) {
  return spawn('npm', ['run', scriptName], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  });
};

module.exports = {
  npmRunScript,
};