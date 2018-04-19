import {ErrorReporting} from '@google-cloud/error-reporting';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Express} from 'express';
import * as fsExtra from 'fs-extra';
import {Server} from 'http';
import * as path from 'path';

import {getRouter as getAutomergeRouter} from './apis/auto-merge';
import {getRouter as getCheckPRStateRouter} from './apis/check-pr-state';
import {getRouter as getDashRouter} from './apis/dash-data';
import {getRouter as getGitHubHookRouter} from './apis/github-webhook';
import {getRouter as getIssuesRouter} from './apis/issues';
import {getRouter as getLastViewedRouter} from './apis/last-viewed';
import {getRouter as getLoginRouter} from './apis/login';
import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getUpdatesRouter} from './apis/updates';
import {getRouter as getUserRouter} from './apis/user';
import {enforceHTTPS} from './utils/enforce-https';
import {performGitHubRedirect} from './utils/perform-github-redirect';
import {requireLogin} from './utils/require-login';

const STATIC_EXT = ['html'];

export class DashServer {
  private app: Express;
  private server: Server|null;
  private errors: ErrorReporting|null = null;

  constructor() {
    this.server = null;
    const app = express();

    if (process.env.NODE_ENV === 'production') {
      app.use(enforceHTTPS);
      this.errors = new ErrorReporting({reportUnhandledRejections: true});
    }

    // Setup common middleware
    app.use(cookieParser());
    app.use(bodyParser.text());
    app.use(bodyParser.json());

    this.setupPublicRoutes(app);

    this.setupPrivateRoutes(app);

    this.app = app;
  }

  private setupPublicRoutes(app: Express) {
    // Enable lit-html
    const litPath = path.dirname(require.resolve('lit-html'));
    app.use('/node_modules/lit-html', express.static(litPath));
    const customElementsPath =
        path.dirname(require.resolve('@webcomponents/custom-elements'));
    app.use(
        '/node_modules/@webcomponents/custom-elements',
        express.static(customElementsPath));

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

    app.get('/signin', performGitHubRedirect);

    // Enable public APIs
    app.use('/api/login/', getLoginRouter());
    app.use('/api/webhook/', getGitHubHookRouter());

    // Must be last middleware.
    if (this.errors) {
      app.use(this.errors.express);
    }
  }

  private async setupPrivateRoutes(app: Express) {
    // Enable /* to serve /client/require-login
    // Enable /bundled.* to serve /client/bundled/require-login
    const privatePath = path.join(__dirname, '..', 'client', 'private-pages');
    const privateFiles = await fsExtra.readdir(privatePath);
    for (const privateFile of privateFiles) {
      if (path.extname(privateFile) !== '.html') {
        console.warn(`Not serving private page as it does not end in .html: '${
            privateFile}'. Subdirectories are not supported.`);
        continue;
      }

      let shortName = path.basename(privateFile, path.extname(privateFile));
      if (shortName === 'index') {
        shortName = '';
      }
      app.get(
          `/${shortName}`,
          requireLogin(true),
          (_request: express.Request, response: express.Response) => {
            response.sendFile(privateFile, {
              root: privatePath,
            });
          });
    }

    // Add login middleware
    app.use(requireLogin());

    // Enable private APIs
    app.use('/api/dash/', getDashRouter());
    app.use('/api/push-subscription/', getPushSubRouter());
    app.use('/api/updates/', getUpdatesRouter());
    app.use('/api/auto-merge/', getAutomergeRouter());
    app.use('/api/check-pr-state/', getCheckPRStateRouter());
    app.use('/api/issues/', getIssuesRouter());
    app.use('/api/last-viewed/', getLastViewedRouter());
    app.use('/api/user/', getUserRouter());

    // Serve app shell on all other routes.
    app.get(
        '/*',
        requireLogin(true),
        (_request: express.Request, response: express.Response) => {
          response.sendFile('index.html', {
            root: privatePath,
          });
        });
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
