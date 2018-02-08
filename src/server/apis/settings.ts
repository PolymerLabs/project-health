import * as express from 'express';
import gql from 'graphql-tag';

import {OrgWebHookState} from '../../types/api';
import {OrgDetailsQuery} from '../../types/gql-types';
import {GitHub} from '../../utils/github';
import {userModel} from '../models/userModel';

import {WEBHOOK_URL} from './webhook';

function getRouter(github: GitHub): express.Router {
  const settingsRouter = express.Router();
  settingsRouter.post(
      '/orgs.json',
      async (request: express.Request, response: express.Response) => {
        const loginDetails =
            await userModel.getLoginFromRequest(github, request);
        if (!loginDetails) {
          response.sendStatus(400);
          return;
        }

        const scopes = loginDetails.scopes;
        if (!scopes ||
            (scopes.indexOf('admin:org_hook') === -1 ||
             scopes.indexOf('read:org') === -1)) {
          response.status(400).send('Missing required scope.');
          return;
        }

        try {
          const orgDetails = await github.query<OrgDetailsQuery>({
            query: orgsDetailsQuery,
            fetchPolicy: 'network-only',
            context: {
              token: loginDetails.token,
            }
          });

          // TODO: Handle orgDetails.data.view.origanizations.totalCount
          // requiring pagination Switching to GitHub.cursorQuery() would be
          // best option.

          const apiOrgs: OrgWebHookState[] = [];
          const orgsData = orgDetails.data.viewer.organizations.nodes;
          if (orgsData) {
            const orgHookPromises = orgsData.map(async (org) => {
              if (!org) {
                return;
              }

              let hookEnabled = false;
              if (org.viewerCanAdminister) {
                const hooks = await github.get(
                    `orgs/${org.login}/hooks`, loginDetails.token);

                for (const hook of hooks) {
                  if (hook.config.url === WEBHOOK_URL) {
                    hookEnabled = true;
                  }
                }
              }

              return {
                login: org.login,
                name: org.name,
                viewerCanAdminister: org.viewerCanAdminister,
                hookEnabled,
              };
            });

            (await Promise.all(orgHookPromises)).forEach((data) => {
              if (data) {
                apiOrgs.push(data);
              }
            });
          }

          response.send(JSON.stringify({
            orgs: apiOrgs,
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
