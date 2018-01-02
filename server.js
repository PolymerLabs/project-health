'use strict';

const {DashServer} = require('./server/lib/server');
const {GitHub} = require('./server/lib/github');

const server = new DashServer(new GitHub());
server.listen();
