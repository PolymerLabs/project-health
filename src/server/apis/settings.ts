import * as express from 'express';
import gql from 'graphql-tag';

import {OrgWebHookState} from '../../types/api';
import {OrgDetailsQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel} from '../models/userModel';

import {getHookUrl} from './manage-webhook';

function getRouter(): express.Router {
  const settingsRouter = express.Router();
  settingsRouter.post(
      '/orgs.json',
      async (request: express.Request, response: express.Response) => {
        const loginDetails = await userModel.getLoginFromRequest(request);
        if (!loginDetails) {
          response.sendStatus(400);
          return;
        }

        const scopes = loginDetails.scopes;
        if (!scopes ||
            (scopes.indexOf('admin:org_hook') === -1 ||
             scopes.indexOf('read:org') === -1)) {
          response.status(400).send({
            error: {
              id: 'missing_scopes',
              message: 'Missing required scope.',
            }
          });
          return;
        }

        try {
          const orgDetails = await github().query<OrgDetailsQuery>({
            query: orgsDetailsQuery,
            fetchPolicy: 'network-only',
            context: {
              token: loginDetails.githubToken,
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

              if (!org.name) {
                return;
              }

              let hookEnabled = false;
              if (org.viewerCanAdminister) {
                try {
                  const hooks = await github().get(
                      `orgs/${org.login}/hooks`, loginDetails.githubToken);

                  const hookUrl = getHookUrl(request);
                  for (const hook of hooks) {
                    if (hook.config.url === hookUrl) {
                      hookEnabled = true;
                    }
                  }
                } catch (err) {
                  // This can occur if the user is a public member of an org
                  // but the OAuth app does not have access due to
                  // org restrictions against GitHub apps.
                  console.log(`Unable to get hooks for ${org.login}.`);
                  return;
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

          // Sort by org name first
          apiOrgs.sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          });

          // Sort by orgs the user can administer
          apiOrgs.sort((a, b) => {
            if (a.viewerCanAdminister === b.viewerCanAdminister) {
              return 0;
            }

            return a.viewerCanAdminister ? -1 : 1;
          });

          response.send(JSON.stringify({
            orgs: apiOrgs,
          }));
        } catch (err) {
          console.error(err);
          response.status(500).send({
            error: {
              message: 'An unhandled error occured: ' + err.message,
            },
          });
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
