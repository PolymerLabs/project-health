import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import {Express} from 'express';
import * as fsExtra from 'fs-extra';
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
import {performGitHubRedirect} from './utils/perform-github-redirect';
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

    app.get('/signin', performGitHubRedirect);

    // Enable public APIs
    app.use('/api/login/', getLoginRouter());
    app.use('/api/webhook/', getGitHubHookRouter());
  }

  private setupPrivateRoutes(app: Express) {
    /**
     * This mounts the given path & handler behind the login middleware.
     */
    function useRoute(path: string, handler: express.Handler) {
      app.use(path, requireLogin, handler);
    }

    /**
     * For each file in the provided directory, the file will be mounted on the
     * filename path excluding static extensions.
     *
     * Note: this currently doesn't recurse and support subdirectories.
     */
    async function serveStatic(dirPath: string) {
      const indexPath = path.join(dirPath, 'index.html');
      if (await fsExtra.pathExists(indexPath)) {
        // Only match / without any trailing bits.
        useRoute('/$', express.static(indexPath));
      }

      for (const filename of await fsExtra.readdir(dirPath)) {
        let basename = filename;
        for (const extension of STATIC_EXT) {
          basename = path.basename(basename, `.${extension}`);
        }
        useRoute(`/${basename}`, express.static(path.join(dirPath, filename)));
      }
    }

    // Enable /* to serve /client/require-login
    // Enable /bundled.* to serve /client/bundled/require-login
    const clientPath = path.join(__dirname, '..', 'client');
    const privatePath = path.join(clientPath, 'require-login');

    serveStatic(privatePath);

    // Enable private APIs
    useRoute('/api/dash/', getDashRouter());
    useRoute('/api/push-subscription/', getPushSubRouter());
    useRoute('/api/manage-webhook/', getManageWebhookRouter());
    useRoute('/api/settings/', getSettingsRouter());
    useRoute('/api/updates/', getUpdatesRouter());
    useRoute('/api/auto-merge/', getAutomergeRouter());
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
