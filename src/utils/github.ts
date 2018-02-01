import {InMemoryCache, IntrospectionFragmentMatcher, NormalizedCacheObject} from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {ApolloQueryResult} from 'apollo-client/core/types';
import {WatchQueryOptions} from 'apollo-client/core/watchQueryOptions';
import {setContext} from 'apollo-link-context';
import {HttpLink} from 'apollo-link-http';
import {DocumentNode} from 'graphql';
import fetch from 'node-fetch';
import * as request from 'request-promise-native';
import {promisify} from 'util';

// tslint:disable-next-line:no-require-imports
const schema = require('../types/github-schema.json');

// Until more widely included, we need to define this symbol to use
// for-await-of statements.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#the-for-await-of-statement
// tslint:disable-next-line:no-any
(Symbol as any).asyncIterator =
    Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator');

export class GitHub {
  private apollo: ApolloClient<NormalizedCacheObject>;
  private jsonUrl: string;

  constructor(
      gqlUrl = 'https://api.github.com/graphql',
      jsonUrl = 'https://api.github.com') {
    // Providing this fragment matcher initialized with the GitHub schema
    // allows the Apollo client to better distinguish polymorphic result types
    // by their "__type" field, which is required for certain queries.
    const fragmentMatcher = new IntrospectionFragmentMatcher(
        {introspectionQueryResultData: schema.data});

    const authLink = setContext((_request, previousContext) => {
      const token = previousContext.token || process.env.GITHUB_TOKEN;
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
            retries < 10) {
          await promisify(setTimeout)((retries + 1) * 1000);
          retries++;
        } else {
          throw e;
        }
      }
    }
    return result;
  }

  /**
   * Issue a multi-page query with automatic cursor management.
   *
   * @template Q The automatically generated query result type.
   * @template V The automatically generated query variables type. It must
   * contain a `cursor` field. This function will automatically update this
   * field for each page.
   *
   * @param query The GraphQL query to execute.
   * @param variables The query variables to pass.
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
      cursorQuery<Q, V extends {cursor?: string | null}>(
          query: DocumentNode,
          variables: V,
          getPageInfo: (result: Q) => {pageInfo: PageInfo} | null):
          AsyncIterable<Q> {
    variables = Object.assign({}, variables);
    let hasNextPage = true;
    while (hasNextPage) {
      const result = await this.query<Q>({query, variables});
      const pageInfo = getPageInfo(result.data);
      hasNextPage = !!pageInfo && pageInfo.pageInfo.hasNextPage;
      variables.cursor = pageInfo && pageInfo.pageInfo.endCursor;
      yield result.data;
    }
  }

  // tslint:disable-next-line:no-any
  async get(path: string, userToken: string, parseJSON = true): Promise<any> {
    const token = userToken || process.env.GITHUB_TOKEN;
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
    if (!parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.get(query);
  }

  async post(path: string, userToken: string, body: {}, parseJSON = true):
    // tslint:disable-next-line:no-any
    Promise<any> {
    const token = userToken || process.env.GITHUB_TOKEN;
    const query = {
      url: this.jsonUrl + '/' + path,
      headers: {
        'Accept': 'application/json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Project Health Bot',
        'Content-Type': 'application/json',
      },
      body,
      json: true,
      resolveWithFullResponse: false,
      simple: true,
    };
    if (!parseJSON) {
      query.json = false;
      query.resolveWithFullResponse = true;
      query.simple = false;
    }
    return await request.post(query);
  }
}

type PageInfo = {
  hasNextPage: boolean; endCursor: string | null;
};
