import * as express from 'express';
import gql from 'graphql-tag';

import {Issue, IssuesResponse, IssueStatus, Popularity} from '../../types/api';
import {issueFieldsFragment, IssuesSearchQuery, popularityFieldsFragment} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel, UserRecord} from '../models/userModel';
import {getIssueLastActivity} from '../utils/get-issue-last-activity';
import {issueHasNewActivity} from '../utils/issue-has-new-activity';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

async function getIssueData(
    userRecord: UserRecord,
    queryCb: (assigneeLogin: string) => string,
    statusCb: (issue: issueFieldsFragment, assigneeLogin: string) =>
        IssueStatus,
    request: express.Request,
    ): Promise<APIResponse> {
  let assigneeLogin = userRecord.username;
  if (request.query.login) {
    assigneeLogin = request.query.login;
  }

  let lastViewedInfo: {[issue: string]: number}|null = null;
  if (assigneeLogin === userRecord.username) {
    lastViewedInfo = await userModel.getAllLastViewedInfo(assigneeLogin);
  }

  const issueResult = await github().query<IssuesSearchQuery>({
    query: issueQuery,
    variables: {
      query: queryCb(assigneeLogin),
    },
    fetchPolicy: 'network-only',
    context: {token: userRecord.githubToken}
  });

  const issues: Issue[] = [];
  if (issueResult.data.search.nodes) {
    for (const node of issueResult.data.search.nodes) {
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

      let hasNewActivity = false;
      if (lastViewedInfo) {
        const lastActivity = await getIssueLastActivity(assigneeLogin, node);
        if (lastActivity) {
          hasNewActivity = await issueHasNewActivity(
              userRecord, lastActivity, lastViewedInfo[node.id]);
        }
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
        hasNewActivity,
        status: statusCb(node, assigneeLogin),
      });
    }
  }

  return responseHelper.data<IssuesResponse>({
    issues,
  });
}

export async function handleAssignedIssues(
    request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  const queryCb = (assigneeLogin: string) =>
      `assignee:${assigneeLogin} is:issue state:open archived:false`;
  const statusCb = (): IssueStatus => {
    return {type: 'Assigned'};
  };
  return await getIssueData(userRecord, queryCb, statusCb, request);
}

export async function handleActivityIssues(
    request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  const queryCb = (assigneeLogin: string) =>
      `is:issue archived:false is:open involves:${assigneeLogin} -assignee:${
          assigneeLogin}`;
  const statusCb = (node: issueFieldsFragment, assigneeLogin: string) => {
    let status: IssueStatus = {
      type: 'Involved',
    };

    if (node.author && node.author.login === assigneeLogin) {
      status = {
        type: 'Author',
      };
    }
    return status;
  };
  return await getIssueData(userRecord, queryCb, statusCb, request);
}

/**
 * Calculate the popularity scope for an issue.
 *
 * Currently a naive implementation that looks at total number of comments
 * and the total number of reactions on the issue itself. This does *not*
 * include reactions on individual comments.
 */
function fetchPopularity(fields: popularityFieldsFragment): Popularity {
  const score = fields.participants.totalCount * 2 +
      fields.commentTotal.count / 2 + fields.reactions.totalCount;
  const scaledScore = Math.round(score / 10);
  return Math.min(Math.max(scaledScore, 1), 4) as Popularity;
}

export function getRouter(): express.Router {
  const issueRouter = new PrivateAPIRouter();
  issueRouter.get('/assigned/', handleAssignedIssues);
  issueRouter.get('/activity/', handleActivityIssues);

  return issueRouter.router;
}

const issueFragment = gql`
fragment issueFields on Issue {
  id
  title
  url
  createdAt
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
}
`;

const popularityFragment = gql`
fragment popularityFields on Issue {
  commentTotal: comments {
    count: totalCount
  }
  reactions {
    totalCount
  }
  participants {
    totalCount
  }
}`;

const commentFragment = gql`
fragment commentFields on Issue {
  createdAt
  author {
    login
    avatarUrl
  }
  comments(last: 1) {
    nodes {
      createdAt
      author {
        login
      }
    }
  }
}`;

const issueQuery = gql`
query IssuesSearch($query: String!){
  search(query:$query,type:ISSUE,last:10) {
    nodes {
      ... on Issue {
        ...issueFields
        ...popularityFields
        ...commentFields
      }
    }
  }
}

${issueFragment}
${popularityFragment}
${commentFragment}
`;
