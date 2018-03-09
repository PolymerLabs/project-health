import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Express} from 'express';
import {Server} from 'http';
import * as path from 'path';

import {getRouter as getAutomergeRouter} from './apis/auto-merge';
import {getRouter as getDashRouter} from './apis/dash-data';
import {getRouter as getGitHubHookRouter} from './apis/github-webhook';
import {getRouter as getLoginRouter} from './apis/login';
import {getRouter as getManageWebhookRouter} from './apis/manage-webhook';
import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getSettingsRouter} from './apis/settings';
import {getRouter as getUpdatesRouter} from './apis/updates';
import {enforceHTTPS} from './utils/enforce-https';
import {requireLogin} from './utils/require-login';

const STATIC_EXT = ['html'];

export class DashServer {
  private app: express.Express;
  private server: Server|null;

  constructor() {
    this.server = null;
    const app = express();

    if (process.env.NODE_ENV === 'production') {
      app.use(enforceHTTPS);
    }

    // Setup common middleware
    app.use(cookieParser());
    app.use(bodyParser.text());
    app.use(bodyParser.json());

    this.setupPublicRoutes(app);

    // Add login middleware
    app.use(requireLogin);

    this.setupPrivateRoutes(app);

    this.app = app;
  }

  private setupPublicRoutes(app: Express) {
    // Enable lit-html
    const litPath = path.dirname(require.resolve('lit-html'));
    app.use('/node_modules/lit-html', express.static(litPath));

    // Enable /* to serve /client/public
    // Enable /bundled.* to serve /client/bundled/public
    const clientPath = path.join(__dirname, '..', 'client');
    const publicPath = path.join(clientPath, 'public');
    const bundledPath = path.join(clientPath, 'bundled', 'public');
    app.use('/', express.static(publicPath, {extensions: STATIC_EXT}));
    app.use('/bundled/', express.static(bundledPath, {extensions: STATIC_EXT}));

    // Enable /* to serve /sw/bundled
    // NOTE: We only serve bundled for sw scoping and lack of module support
    // in service workers.
    const swPath = path.join(__dirname, '..', 'sw', 'bundled');
    app.use('/', express.static(swPath));

    // Enable public APIs
    app.use('/api/login/', getLoginRouter());
    app.use('/api/webhook/', getGitHubHookRouter());

    if (process.env.NODE_ENV !== 'production') {
      app.use('/', express.static(path.join(__dirname, '..', '..')));
    }
  }

  private setupPrivateRoutes(app: Express) {
    // Enable /* to serve /client/require-login
    // Enable /bundled.* to serve /client/bundled/require-login
    const clientPath = path.join(__dirname, '..', 'client');
    const privatePath = path.join(clientPath, 'require-login');
    const bundledPath = path.join(clientPath, 'bundled', 'require-login');
    app.use('/', express.static(privatePath, {extensions: STATIC_EXT}));
    app.use('/bundled/', express.static(bundledPath, {extensions: STATIC_EXT}));

    // Enable private APIs
    app.use('/api/dash/', getDashRouter());
    app.use('/api/push-subscription/', getPushSubRouter());
    app.use('/api/manage-webhook/', getManageWebhookRouter());
    app.use('/api/settings/', getSettingsRouter());
    app.use('/api/updates/', getUpdatesRouter());
    app.use('/api/auto-merge/', getAutomergeRouter());
  }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      const port = Number(process.env.PORT || '') || 8080;

      const printStatus = () => {
        if (!this.server) {
          return reject(new Error('No server configured'));
        }

        const addr = this.server.address();
        let urlHost = addr.address;
        if (addr.family === 'IPv6') {
          urlHost = '[' + urlHost + ']';
        }

        const serverAddress = `http://${urlHost}:${addr.port}`;
        resolve(serverAddress);
      };

      if (process.env.NODE_ENV === 'production') {
        this.server = this.app.listen(port, printStatus);
      } else {
        this.server = this.app.listen(port, 'localhost', printStatus);
      }
    });
  }

  close() {
    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
}
