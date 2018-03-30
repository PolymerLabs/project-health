import * as express from 'express';
import gql from 'graphql-tag';

import {CheckPRPayload, NotificationPullRequestData} from '../../types/api';
import {PRStateQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel} from '../models/userModel';

export function getRouter(): express.Router {
  const checkPRStateRouter = express.Router();
  checkPRStateRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        try {
          if (!request.body) {
            response.status(400).send('No body.');
            return;
          }

          const userRecord = await userModel.getUserRecordFromRequest(request);
          if (!userRecord) {
            response.status(400).send('No login details.');
            return;
          }

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

          const payload: CheckPRPayload = {
            pullRequests: pullRequestData,
          };
          response.json(payload);
        } catch (err) {
          console.error(err);
          response.status(500).send('An unhandled error occured.');
        }
      });

  return checkPRStateRouter;
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
