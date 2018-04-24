import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {issueFieldsFragment, IssuesSearchQuery, popularityFieldsFragment, RepoLabelsQuery, RepoLabelsQueryVariables} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel, UserRecord} from '../models/userModel';
import {getIssueLastActivity} from '../utils/get-issue-last-activity';
import {issueHasNewActivity} from '../utils/issue-has-new-activity';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

async function getIssueData(
    userRecord: UserRecord,
    login: string,
    query: string,
    statusCb: (issue: issueFieldsFragment) => api.IssueStatus,
    _request: express.Request,
    ): Promise<APIResponse<api.IssuesResponse>> {
  let lastViewedInfo: {[issue: string]: number}|null = null;
  if (login === userRecord.username) {
    lastViewedInfo = await userModel.getAllLastViewedInfo(userRecord.username);
  }

  const issueResult = await github().query<IssuesSearchQuery>({
    query: issueQuery,
    variables: {query},
    fetchPolicy: 'network-only',
    context: {token: userRecord.githubToken}
  });

  const issues: api.Issue[] = [];
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
        const lastActivity = await getIssueLastActivity(login, node);
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
        status: statusCb(node),
      });
    }
  }

  return responseHelper.data({
    issues,
  });
}

export async function handleAssignedIssues(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.IssuesResponse>> {
  // Emulated user or authed user.
  const login = request.query.login || userRecord.username;
  const query = `assignee:${login} is:issue state:open archived:false`;
  const calculateStatus = (): api.IssueStatus => {
    return {type: 'Assigned'};
  };
  return await getIssueData(userRecord, login, query, calculateStatus, request);
}

export async function handleActivityIssues(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.IssuesResponse>> {
  // Emulated user or authed user.
  const login = request.query.login || userRecord.username;
  const query =
      `is:issue archived:false is:open involves:${login} -assignee:${login}`;
  const calculateStatus = (node: issueFieldsFragment) => {
    let status: api.IssueStatus = {
      type: 'Involved',
    };

    if (node.author && node.author.login === login) {
      status = {
        type: 'Author',
      };
    }
    return status;
  };
  return await getIssueData(userRecord, login, query, calculateStatus, request);
}

/**
 * Given owner/repo, this will return all the untriaged issues for that repo.
 */
export async function handleUntriagedIssues(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.IssuesResponse>> {
  const params = request.params as {owner: string, repo: string};
  // Do not allow emulation of user.
  const query = `is:issue state:open archived:false no:label repo:${
      params.owner}/${params.repo}`;
  const calculateStatus = (): api.IssueStatus => {
    return {type: 'Untriaged'};
  };
  return await getIssueData(
      userRecord, userRecord.username, query, calculateStatus, request);
}

/**
 * Given owner/repo, this will return the list of issues that match the
 * specified list of comma-separated labels.
 */
export async function handleByLabel(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.IssuesResponse>> {
  const params =
      request.params as {owner: string, repo: string, labels: string};
  const labels = params.labels.split(',')
                     .filter((l) => l.length)
                     .map((l) => `label:"${l}"`);
  // Optimistically apply the "-no:label" field which is currently not
  // supported by GitHub, but ignored.
  const query = `is:issue state:open archived:false repo:${params.owner}/${
      params.repo} ${labels.length ? labels.join(' ') : '-no:label'}`;

  const calculateStatus = (issue: issueFieldsFragment): api.IssueStatus => {
    const assignees = [];
    for (const user of issue.assignees.nodes || []) {
      if (user) {
        assignees.push(user.login);
      }
    }
    if (!assignees.length) {
      return {type: 'Unassigned'};
    }
    return {type: 'AssignedTo', users: assignees};
  };

  return await getIssueData(
      userRecord, userRecord.username, query, calculateStatus, request);
}

/**
 * Fetches labels for a repo.
 */
export async function handleLabels(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.LabelsResponse>> {
  const params = request.params as {owner: string, repo: string};
  const variables:
      RepoLabelsQueryVariables = {owner: params.owner, repo: params.repo};
  const results = github().cursorQuery<RepoLabelsQuery>(
      {
        query: labelsQuery,
        variables,
        context: {token: userRecord.githubToken},
      },
      (result) => result.repository && result.repository.labels);

  const labels = [];
  for await (const data of results) {
    if (!data.repository) {
      continue;
    }
    if (!data.repository.labels) {
      continue;
    }
    for (const label of data.repository.labels.nodes || []) {
      if (!label || label.issues.totalCount === 0) {
        continue;
      }
      labels.push({
        name: label.name,
        description: label.description,
      });
    }
  }

  // Sort alphabetically.
  labels.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  return responseHelper.data({labels});
}

/**
 * Calculate the popularity scope for an issue.
 *
 * Currently a naive implementation that looks at total number of comments
 * and the total number of reactions on the issue itself. This does *not*
 * include reactions on individual comments.
 */
function fetchPopularity(fields: popularityFieldsFragment): api.Popularity {
  const score = fields.participants.totalCount * 2 +
      fields.commentTotal.count / 2 + fields.reactions.totalCount;
  const scaledScore = Math.round(score / 10);
  return Math.min(Math.max(scaledScore, 1), 4) as api.Popularity;
}

export function getRouter(): express.Router {
  const issueRouter = new PrivateAPIRouter();
  issueRouter.get('/assigned/', handleAssignedIssues);
  issueRouter.get('/activity/', handleActivityIssues);
  issueRouter.get('/untriaged/:owner/:repo', handleUntriagedIssues);
  issueRouter.get('/labels/:owner/:repo', handleLabels);
  issueRouter.get('/by-labels/:owner/:repo/:labels(*)', handleByLabel);

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
  assignees(first: 3) {
    nodes {
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

// TODO: This should support cursoring.
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

const labelsQuery = gql`
query RepoLabels($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    labels(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        description
        issues(states: OPEN) {
          totalCount
        }
      }
    }
  }
}
`;
