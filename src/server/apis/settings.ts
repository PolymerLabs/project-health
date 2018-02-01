import * as express from 'express';
import gql from 'graphql-tag';

import {GitHub} from '../../utils/github';
import {userModel} from '../models/userModel';
import {OrgDetailsQuery} from '../../types/gql-types';

function getRouter(github: GitHub): express.Router {
  const settingsRouter = express.Router();
  settingsRouter.post('/orgs.json', async (request: express.Request, response: express.Response) => {
    const loginDetails = await userModel.getLoginFromRequest(request);
    if (!loginDetails) {
        response.sendStatus(400);
        return;
    }

    const scopes = loginDetails.scopes;
    if ((scopes.indexOf('admin:org_hook') === -1 || scopes.indexOf('read:org') === -1)) {
      response.status(400).send('Missing required scope.');
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
          login
          viewerCanAdminister
        }
        totalCount
      },
    }
  }`;
