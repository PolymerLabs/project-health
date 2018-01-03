'use strict';

const {DashServer} = require('./server/lib/server');
const {GitHub} = require('./server/lib/github');

try {
  const secrets = require('./secrets.json');
  if (secrets['GITHUB_CLIENT_SECRET']) {
    process.env.GITHUB_CLIENT_SECRET = secrets['GITHUB_CLIENT_SECRET'];
  }
} catch (err) {
  // No secrets defined.
}

const server = new DashServer(new GitHub());
server.listen();
