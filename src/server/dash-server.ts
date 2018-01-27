import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Server} from 'http';
import * as path from 'path';
import * as request from 'request-promise-native';

import {GitHub} from '../utils/github';

import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getWebhookRouter} from './apis/webhook';
import {DashData} from './apis/dash-data';

type DashSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
};

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
    app.post('/login', bodyParser.text(), this.handleLogin.bind(this));

    app.use('/api/push-subscription/', getPushSubRouter(this.github));
    app.use('/api/webhook/', getWebhookRouter());

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

  async handleLogin(req: express.Request, res: express.Response) {
    if (!req.body) {
      res.sendStatus(400);
      return;
    }
    const postResp = await request.post({
      url: 'https://github.com/login/oauth/access_token',
      headers: {'Accept': 'application/json'},
      form: {
        'client_id': this.secrets.GITHUB_CLIENT_ID,
        'client_secret': this.secrets.GITHUB_CLIENT_SECRET,
        'code': req.body,
      },
      json: true,
    });

    if (postResp['error']) {
      console.log(postResp);
      res.sendStatus(500);
      return;
    }

    res.cookie('id', postResp['access_token'], {httpOnly: true});
    res.end();
  }
}
