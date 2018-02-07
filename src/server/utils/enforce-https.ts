import * as express from 'express';

export function enforceHTTPS(
    req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['x-appengine-https'] !== 'on') {
    res.header('Location', `https://${req.headers['host']}${req.url}`);
    res.sendStatus(301);
    return;
  }
  next();
}