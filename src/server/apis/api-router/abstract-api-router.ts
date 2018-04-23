import * as express from 'express';

import {JSONAPIDataResponse, JSONAPIErrorResponse} from '../../../types/api';
import {UserRecord} from '../../models/userModel';

import * as responseHelper from './response-helper';

export interface CookiesObject {
  [key: string]: {
    value: string,
    options: {},
  };
}

export interface ErrorAPIResponse extends JSONAPIErrorResponse {
  statusCode: number;
}

export interface DataAPIResponse<T> extends JSONAPIDataResponse<T> {
  statusCode: number;
  cookies?: CookiesObject;
}

export type APIResponse<D> = ErrorAPIResponse|DataAPIResponse<D>;

export type PublicAPICallback<D> = (request: express.Request) =>
    Promise<APIResponse<D>>;

export type PrivateAPICallback<D> =
    (request: express.Request, userRecord: UserRecord) =>
        Promise<APIResponse<D>>;

export type APIRouteCallback<D> = PublicAPICallback<D>|PrivateAPICallback<D>;

interface APIRouteOpts {
  requireBody?: boolean;
}

export abstract class AbstractAPIRouter {
  protected expRouter: express.Router;

  constructor() {
    this.expRouter = express.Router();
  }

  get<D>(apiPath: string, callback: APIRouteCallback<D>) {
    this.expRouter.get(apiPath, this.wrapCallback(callback, {}));
  }

  post<D>(
      apiPath: string,
      callback: APIRouteCallback<D>,
      opts: APIRouteOpts = {}) {
    this.expRouter.post(apiPath, this.wrapCallback(callback, opts));
  }

  private wrapCallback<D>(callback: APIRouteCallback<D>, opts: APIRouteOpts) {
    return async (request: express.Request, response: express.Response) => {
      try {
        // Some other middleware may have responded to the request.
        if (response.headersSent) {
          return;
        }

        // If the api requires a body, we can quickly response.
        if (opts.requireBody && !request.body) {
          this.sendResponse(
              response,
              responseHelper.error(
                  'no-body', 'You must provide a request body for this API.'),
          );
          return;
        }

        const apiResponse =
            await this.executeCallback(callback, request, response);

        this.sendResponse(response, apiResponse);
      } catch (err) {
        this.sendResponse(
            response,
            responseHelper.error(
                'uncaught-exception',
                `An uncaught exception was thrown: '${err.message}'`));
      }
    };
  }

  get router() {
    return this.expRouter;
  }

  private sendResponse<D>(
      response: express.Response,
      apiResponse: APIResponse<D>) {
    response.status(apiResponse.statusCode);

    // Set any cookies if they are defined.
    if ('cookies' in apiResponse &&
        typeof apiResponse.cookies !== 'undefined') {
      const cookies: CookiesObject = apiResponse.cookies;
      Object.keys(cookies).forEach((key) => {
        const cookieDetails = cookies[key];
        response.cookie(key, cookieDetails.value, cookieDetails.options);
      });
    }

    if ('error' in apiResponse) {
      response.json({error: apiResponse.error});
    } else {
      response.json({data: apiResponse.data});
    }
  }

  protected abstract executeCallback<D>(
      callback: APIRouteCallback<D>,
      request: express.Request,
      response: express.Response): Promise<APIResponse<D>>;
}
