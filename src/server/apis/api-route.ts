import * as express from 'express';
import {JSONAPIResponse} from '../../types/api';

export interface ResponseDetails<T> extends JSONAPIResponse<T> {
  statusCode: number;
  cookies?: {
    [key: string]: {
      value: string,
      options: {},
    }
  };
}

type APIRouteCb<T> = (request: express.Request) => Promise<ResponseDetails<T>>;

/**
 * @param routeCb A callback function that will return an instance of
 * ResponseDetails which is used to response to the origin express request.
 */
export function createAPIRoute<T>(routeCb: APIRouteCb<T>) {
  return async (request: express.Request, response: express.Response) => {
    try {
      const apiResponse = await routeCb(request);
      if (response.headersSent) {
        // Some other middleware responded to the request
        return;
      }

      // Set any cookies if they are defined.
      if (apiResponse.cookies) {
        Object.keys(apiResponse.cookies).forEach((key) => {
          if (!apiResponse.cookies) {
            return;
          }

          const cookieDetails = apiResponse.cookies[key];
          response.cookie(key, cookieDetails.value, cookieDetails.options);
        });
      }

      // Ensure error OR data are added to the response, not both.
      const jsonResponse: JSONAPIResponse<T> = {};
      if (apiResponse.error) {
        jsonResponse.error = apiResponse.error;
      } else {
        jsonResponse.data = apiResponse.data;
      }

      response.status(apiResponse.statusCode).json(jsonResponse);
    } catch (err) {
      response.status(500).json({
        error: {
          code: 'uncaught-exception',
          message: 'An uncaught exception was thrown: ' + err.message,
        },
      });
    }
  };
}
