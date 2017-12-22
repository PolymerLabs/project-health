'use strict';

const {DashServer} = require('./server/lib/server');
const {GitHub} = require('./server/lib/gql');

const server = new DashServer(new GitHub());
server.listen();
