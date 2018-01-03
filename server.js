'use strict';

const {DashServer} = require('./server/lib/dash-server');
const {GitHub} = require('./server/lib/github');
const secrets = require('./secrets.json');

const server = new DashServer(new GitHub(), secrets);
server.listen();
