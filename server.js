'use strict';

const {DashServer} = require('./server/lib/dash-server');
const {GitHub} = require('./server/lib/github');
const fs = require('fs');
const path = require('path');
const secrets = require('./secrets.json');

const devKey = path.join(__dirname, 'dev-only-gcloud-key.json');
if (fs.existsSync(devKey)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = devKey;
}

const server = new DashServer(new GitHub(), secrets);
server.listen();
