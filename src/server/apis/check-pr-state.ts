import * as express from 'express';
import gql from 'graphql-tag';

import {CheckPRPayload, NotificationPullRequestData} from '../../types/api';
import {PRStateQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
// import {github} from '../../utils/github';
import {userModel} from '../models/userModel';

function getRouter(): express.Router {
  const checkPRStateRouter = express.Router();
  checkPRStateRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        try {
          if (!request.body) {
            response.status(400).send('No body.');
            return;
          }

          const loginDetails = await userModel.getLoginFromRequest(request);
          if (!loginDetails) {
            response.status(400).send('No login details.');
            return;
          }

          const pullRequests = request.body;

          const prIds: string[] = [];
          for (const pullRequest of pullRequests) {
            if (!pullRequest.gqlId) {
              response.status(400).send('No gqlId.');
              return;
            }

            prIds.push(pullRequest.gqlId);
          }

          const pullRequestData: NotificationPullRequestData[] = [];
          if (prIds.length > 0) {
            // tslint:disable-next-line:no-any
            const results = await github().query<PRStateQuery>({
              query: prStateQuery,
              variables: {
                prIds,
              },
              fetchPolicy: 'network-only',
              context: {token: loginDetails.githubToken}
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

export {getRouter};

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
