const path = require('path');
const nodemon = require('nodemon');

function server() {
  nodemon({
    script: path.join(global.__buildConfig.dest, 'server.js'),
    watch: [global.__buildConfig.dest],
  });
};

module.exports = {
  task: server,
};