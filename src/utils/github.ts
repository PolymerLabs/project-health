import {InMemoryCache, IntrospectionFragmentMatcher, NormalizedCacheObject} from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {ApolloQueryResult} from 'apollo-client/core/types';
import {WatchQueryOptions} from 'apollo-client/core/watchQueryOptions';
import {setContext} from 'apollo-link-context';
import {HttpLink} from 'apollo-link-http';
import fetch from 'node-fetch';
import * as request from 'request-promise-native';
import {promisify} from 'util';

interface RestOpts {
  parseJSON?: boolean;
  customHeaders?: {[name: string]: string};
}

// tslint:disable-next-line:no-require-imports
const schema = require('../types/github-schema.json');

// Until more widely included, we need to define this symbol to use
// for-await-of statements.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#the-for-await-of-statement
// tslint:disable-next-line:no-any
(Symbol as any).asyncIterator =
    Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator');

class GitHub {
  private apollo: ApolloClient<NormalizedCacheObject>;
  private jsonUrl: string;

  constructor(gqlUrl: string, jsonUrl: string) {
    // Providing this fragment matcher initialized with the GitHub schema
    // allows the Apollo client to better distinguish polymorphic result types
    // by their "__type" field, which is required for certain queries.
    const fragmentMatcher = new IntrospectionFragmentMatcher(
        {introspectionQueryResultData: schema.data});

    const authLink = setContext((_request, previousContext) => {
      const token = previousContext.token;
      return {
        headers: {
          ...previousContext.headers,
          authorization: token ? `Bearer ${token}` : null,
        }
      };
    });

    this.apollo = new ApolloClient({
      link: authLink.concat(new HttpLink({
        uri: gqlUrl,
        headers: {'User-Agent': 'Project Health'},
        fetch,
      })),
      cache: new InMemoryCache({fragmentMatcher}),
    });

    this.jsonUrl = jsonUrl;
  }

  /**
   * Wrapper for Apollo's query function that retries automatically.
   */
  async query<T>(options: WatchQueryOptions): Promise<ApolloQueryResult<T>> {
    let result;
    let retries = 0;
    while (!result) {
      try {
        result = await this.apollo.query<T>(Object.assign({}, options));
      } catch (e) {
        // Retry the request up to 5 times, backing off an extra second each
        // time.
        if (e.networkError && e.networkError.statusCode === 403 &&
            retries < 30) {
          await promisify(setTimeout)((retries + 1) * 1000);
          retries++;
        } else {
          if (options.query.loc && options.query.loc.source) {
            console.warn(
                'Failed to query GitHub for:', options.query.loc.source);
          }

          if (e.networkError && e.networkError.result &&
              e.networkError.result.message) {
            throw new Error(e.networkError.result.message);
          } else {
            throw e;
          }
        }
      }
    }
    return result;
  }

  /**
   * Issue a multi-page query with automatic cursor management.
   *
   * @template T The automatically generated query result type.
   *
   * @param options The GraphQL options containing query & variables to execute.
   * @param getPageInfo A function that receives a query result page, and
   * returns an object that contains a `pageInfo` object (which must contain
   * `hasNextPage` and `endCursor`). Note that this `pageInfo` object should be
   * automatically generated from the GraphQL query, so this function should
   * typically just be a short path expression to extract it from the result
   * (e.g. `(data) => data.foo && data.foo.bar`).
   *
   * @returns An async iterator over each page of query results. Use with a
   * `for-await-of` loop.
   */
  async *
      cursorQuery<T>(options: WatchQueryOptions, getPageInfo: (result: T) => {
        pageInfo: PageInfo
      } | null): AsyncIterable<T> {
    const variables = Object.assign({}, options.variables);
    let hasNextPage = true;
    while (hasNextPage) {
      const result = await this.query<T>(Object.assign(options, {variables}));
      const pageInfo = getPageInfo(result.data);
      hasNextPage = !!pageInfo && pageInfo.pageInfo.hasNextPage;
      variables.cursor = pageInfo && pageInfo.pageInfo.endCursor;
      yield result.data;
    }
  }

  private finaliseOpts(opts?: RestOpts): RestOpts {
    return Object.assign(
        {
          parseJSON: true,
        },
        opts);
  }

  // tslint:disable-next-line:no-any
  async get(path: string, token: string, opts?: RestOpts): Promise<any> {
    opts = this.finaliseOpts(opts);
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: {
        'Accept': 'application/json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Project Health Bot',
      },
      json: true,
      resolveWithFullResponse: false,
      simple: true,
    };
    if (!opts.parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.get(query);
  }

  async put(path: string, userToken: string, body: {}, opts?: RestOpts):
      // tslint:disable-next-line:no-any
      Promise<any> {
    opts = this.finaliseOpts(opts);
    const token = userToken || process.env.GITHUB_TOKEN;
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: Object.assign(
          {
            'Accept': 'application/json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
          },
          opts.customHeaders),
      body,
      json: true,
      resolveWithFullResponse: false,
      simple: true,
    };
    if (!opts.parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.put(query);
  }

  async post(path: string, token: string, body: {}, opts?: RestOpts):
      // tslint:disable-next-line:no-any
      Promise<any> {
    opts = this.finaliseOpts(opts);
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: Object.assign(
          {
            'Accept': 'application/json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
            'Content-Type': 'application/json',
          },
          opts.customHeaders),
      body,
      json: true,
      resolveWithFullResponse: false,
      simple: true,
    };
    if (!opts.parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.post(query);
  }

  async delete(path: string, token: string, opts?: RestOpts): Promise<void> {
    opts = this.finaliseOpts(opts);
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: Object.assign(
          {
            'Accept': 'application/json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
            'Content-Type': 'application/json',
          },
          opts.customHeaders),
      resolveWithFullResponse: false,
    };
    await request.delete(query);
  }

  async patch(path: string, token: string, body: {}, opts?: RestOpts):
      // tslint:disable-next-line:no-any
      Promise<any> {
    opts = this.finaliseOpts(opts);
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: Object.assign(
          {
            'Accept': 'application/json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
            'Content-Type': 'application/json',
          },
          opts.customHeaders),
      body,
      json: true,
      resolveWithFullResponse: false,
      simple: true,
    };
    if (!opts.parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.patch(query);
  }
}

type PageInfo = {
  hasNextPage: boolean; endCursor: string | null;
};

let githubSingleton: GitHub|null = null;

export function github(): GitHub {
  if (!githubSingleton) {
    throw new Error('Github is not initialised.');
  }
  return githubSingleton;
}

export function initGithub(
    gqlUrl = 'https://api.github.com/graphql',
    jsonUrl = 'https://api.github.com') {
  githubSingleton = new GitHub(gqlUrl, jsonUrl);
}
