import * as express from 'express';
import gql from 'graphql-tag';

import {Issue, IssuesResponse, Popularity} from '../../types/api';
import {AssignedIssuesQuery, popularityFieldsFragment} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel} from '../models/userModel';

export async function handleGetIssues(
    request: express.Request, response: express.Response) {
  try {
    const loginDetails = await userModel.getLoginFromRequest(request);
    if (!loginDetails) {
      response.status(400).send('No login details.');
      return;
    }

    let assigneeLogin = loginDetails.username;
    if (request.query.login) {
      assigneeLogin = request.query.login;
    }
    const assignedIssuesResult = await github().query<AssignedIssuesQuery>({
      query: assignedIssuesQuery,
      variables: {
        query: `assignee:${assigneeLogin} is:issue state:open`,
      },
      fetchPolicy: 'network-only',
      context: {token: loginDetails.githubToken}
    });

    const issues: Issue[] = [];
    if (assignedIssuesResult.data.search.nodes) {
      for (const node of assignedIssuesResult.data.search.nodes) {
        if (!node) {
          continue;
        }

        if (node.__typename !== 'Issue') {
          continue;
        }

        if (!node.author) {
          // This should never be the case
          continue;
        }

        issues.push({
          id: node.id,
          title: node.title,
          repo: node.repository.name,
          owner: node.repository.owner.login,
          author: node.author.login,
          avatarUrl: node.author.avatarUrl,
          createdAt: new Date(node.createdAt).getTime(),
          url: node.url,
          popularity: fetchPopularity(node),
        });
      }
    }

    const issuesResponse: IssuesResponse = {
      issues,
    };
    response.json(issuesResponse);
  } catch (err) {
    console.error(err);
    response.status(500).send('An unhandled error occured.');
  }
}

/**
 * Calculate the popularity scope for an issue.
 *
 * Currently a naive implementation that looks at total number of comments and
 * the total number of reactions on the issue itself. This does *not* include
 * reactions on individual comments.
 */
function fetchPopularity(fields: popularityFieldsFragment): Popularity {
  const score = fields.participants.totalCount * 2 +
      fields.comments.totalCount / 2 + fields.reactions.totalCount;
  const scaledScore = Math.round(score / 10);
  return Math.min(Math.max(scaledScore, 1), 4) as Popularity;
}

export function getRouter(): express.Router {
  const automergeRouter = express.Router();
  automergeRouter.get('/assigned/', handleGetIssues);

  return automergeRouter;
}

const assignedIssuesQuery = gql`
query AssignedIssues($query: String!){
  search(query:$query,type:ISSUE,last:20) {
    nodes {
      ... on Issue {
        id
        title
        createdAt
        url
        author {
          login
          avatarUrl
        }
        repository {
          name
          owner {
            login
          }
        }
        ...popularityFields
      }
    }
  }
}

fragment popularityFields on Issue {
  comments {
    totalCount
  }
  reactions {
    totalCount
  }
  participants {
    totalCount
  }
}
`;
