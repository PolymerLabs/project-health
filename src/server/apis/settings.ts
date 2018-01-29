import * as express from 'express';
import gql from 'graphql-tag';

import {GitHub} from '../../utils/github';
import {getLoginFromRequest} from '../utils/login-from-request';
import {OrgDetailsQuery} from '../../types/gql-types';

function getRouter(github: GitHub): express.Router {
  const settingsRouter = express.Router();
  settingsRouter.post('/orgs.json', async (request: express.Request, response: express.Response) => {
    try {
      const loginDetails = await getLoginFromRequest(github, request);
      if (!loginDetails) {
          response.sendStatus(400);
          return;
      }

      // TODO: Run github query to get org web hook state etc
      let orgDetails;
      try {
        orgDetails = await github.query<OrgDetailsQuery>({
          query: orgsDetailsQuery,
          fetchPolicy: 'network-only',
          context: {
            token: loginDetails.token,
          }
        });
      } catch (err) {
        // TODO: Hack until scopes can be pushed.
        orgDetails = {
          data: {
            viewer: {
              organizations: {
                nodes: [
                  {
                    name: 'Google',
                    viewerCanAdminister: false
                  },
                  {
                    name: 'Udacity',
                    viewerCanAdminister: false
                  },
                  {
                    name: 'HTML5Rocks',
                    viewerCanAdminister: false
                  },
                  {
                    name: 'PolymerLabs',
                    viewerCanAdminister: false
                  },
                  {
                    name: 'Web Starter Kit',
                    viewerCanAdminister: true
                  },
                  {
                    name: 'GoogleChromeLabs',
                    viewerCanAdminister: true
                  }
                ]
              }
            }
          }
        }
      }

      const orgs = orgDetails.data.viewer.organizations.nodes;

      // TODO: Handle orgDetails.data.view.origanizations.totalCount requiring
      // pagination
      // Switching to GitHub.cursorQuery() would be best option.

      response.send(JSON.stringify({
        orgs,
      }));
    } catch (err) {
      console.error(err);
      response.status(500).send('An unhandled error occured.');
    }
  });

  return settingsRouter;
}

export {getRouter};

const orgsDetailsQuery = gql`
  query OrgDetails {
    viewer {
      organizations(first: 20) {
        nodes {
          name
          viewerCanAdminister
        }
        totalCount
      },
    }
  }`;
