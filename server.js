'use strict';

const { DashServer } = require('./build/server/dash-server');
const { GitHub } = require('./build/utils/github');
const fs = require('fs');
const path = require('path');
const secrets = require('./secrets.json');

// See https://cloud.google.com/docs/authentication/production
for (const file of fs.readdirSync(__dirname)) {
  if (file.match(/^github-health-.*\.json$/)) {
    console.log('using gcloud credentials file', file);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, file);
    break;
  }
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(
    'no gcloud credentials file found;',
    'using application default credentials');
}

const server = new DashServer(new GitHub(), secrets);
server.listen();

// Display stack traces for uncaught errors.
const logError = (err) => {
  console.error(err);
  throw err;
};
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);
