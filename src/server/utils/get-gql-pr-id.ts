import gql from 'graphql-tag';

import {GraphQLPRIDQuery} from '../../types/gql-types';
import {github} from '../../utils/github';

export async function getPRID(
    token: string, owner: string, name: string, num: number):
    Promise<string|null> {
  const results = await github().query<GraphQLPRIDQuery>({
    query: graphqlPRId,
    variables: {owner, name, num},
    fetchPolicy: 'network-only',
    context: {token}
  });

  if (!results.data.repository || !results.data.repository.pullRequest) {
    return null;
  }

  return results.data.repository.pullRequest.id;
}

const graphqlPRId = gql`
query GraphQLPRID($name: String!, $owner: String!, $num: Int!) {
  repository(name:$name, owner: $owner) {
    pullRequest(number: $num) {
      id
    }
  }
}
`;
