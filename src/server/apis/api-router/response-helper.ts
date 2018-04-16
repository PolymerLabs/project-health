import {CookiesObject, DataAPIResponse, ErrorAPIResponse} from './abstract-api-router';

interface ResponseOptions {
  statusCode?: number;
  cookies?: CookiesObject;
}

export function error(
    code: string, message: string, opts?: ResponseOptions): ErrorAPIResponse {
  opts = opts || {};

  const finalOpts: {statusCode: number} = Object.assign(
      {
        statusCode: 400,
      },
      opts);

  return {
    statusCode: finalOpts.statusCode,
    error: {
      code,
      message,
    },
  };
}

export function data<T>(data: T, opts?: ResponseOptions): DataAPIResponse<T> {
  opts = opts || {};

  const finalOpts: {statusCode: number, cookies?: CookiesObject} =
      Object.assign(
          {
            statusCode: 200,
            cookies: undefined,
          },
          opts);

  return {
    statusCode: finalOpts.statusCode,
    cookies: finalOpts.cookies,
    data,
  };
}
