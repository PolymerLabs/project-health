import * as express from 'express';
import gql from 'graphql-tag';

import {CheckPRPayload, NotificationPullRequestData} from '../../types/api';
import {PRStateQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {UserRecord} from '../models/userModel';

import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handlePRCheckState(
    request: express.Request, userRecord: UserRecord) {
  const prIds = request.body;

  const pullRequestData: NotificationPullRequestData[] = [];
  if (prIds.length > 0) {
    const results = await github().query<PRStateQuery>({
      query: prStateQuery,
      variables: {
        prIds,
      },
      fetchPolicy: 'network-only',
      context: {token: userRecord.githubToken}
    });

    if (results.data.nodes) {
      for (const node of results.data.nodes) {
        if (!node) {
          continue;
        }

        if (node.__typename !== 'PullRequest') {
          continue;
        }

        if (node.state && node.id) {
          pullRequestData.push({
            gqlId: node.id,
            state: node.state,
          });
        }
      }
    }
  }

  return responseHelper.data<CheckPRPayload>({
    pullRequests: pullRequestData,
  });
}

export function getRouter(): express.Router {
  const prStateRouter = new PrivateAPIRouter();
  prStateRouter.post('/', handlePRCheckState, {
    requireBody: true,
  });
  return prStateRouter.router;
}

const prStateQuery = gql`
query PRState($prIds: [ID!]!) {
  nodes(ids: $prIds) {
    ...on PullRequest {
      id
      state
    }
  }
}
`;
