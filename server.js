'use strict';

const {DashServer} = require('./build/server/dash-server');
const {GitHub} = require('./build/utils/github');
const secrets = require('./secrets.json');

const server = new DashServer(new GitHub(), secrets);
server.listen();
