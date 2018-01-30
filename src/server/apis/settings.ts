import * as express from 'express';
import gql from 'graphql-tag';

import {GitHub} from '../../utils/github';
import {getLoginFromRequest} from '../utils/login-from-request';
import {OrgDetailsQuery} from '../../types/gql-types';

function getRouter(github: GitHub): express.Router {
  const settingsRouter = express.Router();
  settingsRouter.post('/orgs.json', async (request: express.Request, response: express.Response) => {
    const loginDetails = await getLoginFromRequest(github, request);
    if (!loginDetails) {
        response.sendStatus(400);
        return;
    }

    try {
      // TODO: Run github query to get org web hook state etc

      const orgDetails = await github.query<OrgDetailsQuery>({
        query: orgsDetailsQuery,
        fetchPolicy: 'network-only',
        context: {
          token: loginDetails.token,
        }
      });

      // TODO: Handle orgDetails.data.view.origanizations.totalCount requiring
      // pagination
      // Switching to GitHub.cursorQuery() would be best option.

      response.send(JSON.stringify({
        orgs: orgDetails.data.viewer.organizations.nodes,
      }));
    } catch (err) {
      // TODO: Handle scenario where scope is missing
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
