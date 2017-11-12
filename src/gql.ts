import {InMemoryCache, IntrospectionFragmentMatcher, NormalizedCache} from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {ApolloQueryResult} from 'apollo-client/core/types';
import {WatchQueryOptions} from 'apollo-client/core/watchQueryOptions';
import {HttpLink} from 'apollo-link-http';
import {DocumentNode} from 'graphql';
import fetch from 'node-fetch';
import {promisify} from 'util';

const schema = require('../github-schema.json');

// Until more widely included, we need to define this symbol to use
// for-await-of statements.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#the-for-await-of-statement
(Symbol as any).asyncIterator =
    Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator');

export class GitHub {
  private apollo: ApolloClient<NormalizedCache>;

  constructor(uri = 'https://api.github.com/graphql') {
    // Providing this fragment matcher initialized with the GitHub schema
    // allows the Apollo client to better distinguish polymorphic result types
    // by their "__type" field, which is required for certain queries.
    const fragmentMatcher = new IntrospectionFragmentMatcher(
        {introspectionQueryResultData: schema.data});

    this.apollo = new ApolloClient({
      link: new HttpLink({
        uri,
        headers: {
          'Authorization': 'bearer ' + process.env.GITHUB_TOKEN,
          'User-Agent': 'Project Health'
        },
        fetch: fetch,
      }),
      cache: new InMemoryCache({fragmentMatcher}),
    });
  }

  /**
   * Wrapper for Apollo's query function that retries automatically.
   */
  async query<T>(options: WatchQueryOptions): Promise<ApolloQueryResult<T>> {
    let result;
    let retries = 0;
    while (!result) {
      try {
        if (options.notifyOnNetworkStatusChange != undefined)
          debugger;
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
}

type PageInfo = {
  hasNextPage: boolean; endCursor: string | null;
}
