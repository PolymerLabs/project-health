import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Server} from 'http';
import * as path from 'path';

import {GitHub} from '../utils/github';

import {DashData} from './apis/dash-data';
import {DashSecrets} from '../types/api';
import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getSettingsRouter} from './apis/settings';
import {getRouter as getWebhookRouter} from './apis/webhook';
import {getRouter as getLoginRouter} from './apis/login';

export class DashServer {
  private secrets: DashSecrets;
  private github: GitHub;
  private app: express.Express;

  constructor(github: GitHub, secrets: DashSecrets) {
    this.github = github;
    this.secrets = secrets;

    const app = express();
    const litPath = path.join(__dirname, '../../node_modules/lit-html');

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '../client')));

    app.get('/dash.json', new DashData(this.github).getHandler());
    app.use('/api/login/', bodyParser.text(), getLoginRouter(this.github, this.secrets));

    app.use('/api/push-subscription/', getPushSubRouter());
    app.use('/api/webhook/', bodyParser.json(), getWebhookRouter(this.github));
    app.use('/api/settings/', getSettingsRouter(this.github));

    this.app = app;
  }

  listen() {
    const port = Number(process.env.PORT || '') || 8080;
    let server: Server;
    const printStatus = () => {
      const addr = server.address();
      let urlHost = addr.address;
      if (addr.family === 'IPv6') {
        urlHost = '[' + urlHost + ']';
      }
      console.log('project health server listening');
      console.log(`http://${urlHost}:${addr.port}`);
    };

    if (process.env.NODE_ENV === 'production') {
      server = this.app.listen(port, printStatus);
    } else {
      server = this.app.listen(port, 'localhost', printStatus);
    }
  }
}
