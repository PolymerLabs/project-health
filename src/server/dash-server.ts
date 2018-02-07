import {Firestore} from '@google-cloud/firestore';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Server} from 'http';
import * as path from 'path';

import {GitHub} from '../utils/github';

import {DashData} from './apis/dash-data';
import {getRouter as getLoginRouter} from './apis/login';
import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getSettingsRouter} from './apis/settings';
import {getRouter as getWebhookRouter} from './apis/webhook';

export type DashSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
  PUBLIC_VAPID_KEY: string;
  PRIVATE_VAPID_KEY: string;
};

export class DashServer {
  private secrets: DashSecrets;
  private github: GitHub;
  private app: express.Express;
  private firestore: Firestore;

  constructor(github: GitHub, secrets: DashSecrets) {
    this.github = github;
    this.secrets = secrets;
    this.firestore = new Firestore();

    const app = express();
    const litPath = path.dirname(require.resolve('lit-html'));

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '../client')));
    app.use(express.static(path.join(__dirname, '../sw')));

    app.get('/dash.json', new DashData(this.github).getHandler());
    app.use(
        '/api/login/',
        bodyParser.text(),
        getLoginRouter(this.github, this.secrets));

    app.use('/api/push-subscription/', getPushSubRouter());
    app.use(
        '/api/webhook/',
        bodyParser.json(),
        getWebhookRouter(this.github, this.secrets));
    app.use('/api/settings/', getSettingsRouter(this.github));

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
    const colRef = this.firestore.collection('test');
    const snapshot = await colRef.get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  }
}
