import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Server} from 'http';
import * as path from 'path';

import {firestore} from '../utils/firestore';
import {DashData} from './apis/dash-data';
import {getRouter as getLoginRouter} from './apis/login';
import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getSettingsRouter} from './apis/settings';
import {getRouter as getWebhookRouter} from './apis/webhook';
import {getRouter as getGitHubHookRouter} from './apis/github-webhook';
import {enforceHTTPS} from './utils/enforce-https';
import {requireLogin} from './utils/require-login';

export class DashServer {
  private app: express.Express;

  constructor() {
    const app = express();
    const litPath = path.dirname(require.resolve('lit-html'));

    if (process.env.NODE_ENV === 'production') {
      app.use(enforceHTTPS);
    }

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '..', 'client', 'public'), {
      extensions: ['html']
    }));
    app.use(express.static(path.join(__dirname, '..', 'sw')));
    app.use('/api/login/', bodyParser.text(), getLoginRouter());
    app.use('/api/webhook/', bodyParser.json(), getGitHubHookRouter());

    // Require Login for all endpoints used after this middleware
    app.use(requireLogin);

    app.use(express.static(path.join(__dirname, '..', 'client', 'require-login'), {
      extensions: ['html']
    }));
    app.get('/api/dash.json', new DashData().getHandler());
    app.use('/api/push-subscription/', getPushSubRouter());
    app.use('/api/manage-webhook/', bodyParser.json(), getWebhookRouter());
    app.use('/api/settings/', getSettingsRouter());

    app.get('/firestore-test', this.handleFirestoreTest.bind(this));

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

  async handleFirestoreTest(_req: express.Request, res: express.Response) {
    const colRef = firestore().collection('test');
    const snapshot = await colRef.get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  }
}
