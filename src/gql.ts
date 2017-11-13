import {InMemoryCache, IntrospectionFragmentMatcher, NormalizedCache} from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {ApolloQueryResult} from 'apollo-client/core/types';
import {WatchQueryOptions} from 'apollo-client/core/watchQueryOptions';
import {HttpLink} from 'apollo-link-http';
import fetch from 'node-fetch';
import {promisify} from 'util';

const schema = require('../github-schema.json');

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
}
