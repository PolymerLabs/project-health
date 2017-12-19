/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import gql from 'graphql-tag';

import {MetricResult} from './metric-result';
import {getOrgRepos} from '../common';
import {GitHub} from '../gql';
import {IssuesQuery, IssuesQueryVariables} from '../gql-types';

export type IssueCountOpts = {
  org: string,
  repo?: string,
};

/**
 * Fetch the issue counts metric.
 *
 * Provides a time series containing the number of opened and closed issues for
 * each day.
 */
export async function getIssueCounts(
    github: GitHub, opts: IssueCountOpts): Promise<IssueCountResult> {
  let repos;
  if (opts.repo) {
    repos = [{owner: opts.org, name: opts.repo}];
  } else {
    repos = await getOrgRepos(github, opts.org);
  }

  const issues: Issue[] = [];
  for (const {owner, name} of repos) {
    for (const issue of await getIssues(github, owner, name)) {
      issues.push(issue);
    }
  }
  return new IssueCountResult(issues);
}

/**
 * Issue counts for a particular day.
 */
export type TimeSeriesPoint = {
  // YYYY-MM-DD
  date: string,

  // How many issues were opened on this day (non-cumulative).
  numOpened: number,

  // How many issues were closed on this day (non-cumulative).
  numClosed: number,
};

/**
 * Issue counts metric result object.
 */
export class IssueCountResult implements MetricResult {
  issues: Issue[];

  constructor(issues: Issue[]) {
    this.issues = issues;
  }

  /**
   * Return a time series of issue counts sorted by date, oldest first.
   */
  timeSeries(): TimeSeriesPoint[] {
    const dayPoints = new Map<string, TimeSeriesPoint>();

    function dayPoint(timestamp: string): TimeSeriesPoint {
      // Issue date from the API is an ISO 8601 timestamp. We just want day
      // resolution, so take only the YYYY-MM-DD date part.
      const date = timestamp.split('T')[0];
      let point = dayPoints.get(date);
      if (!point) {
        point = {date, numOpened: 0, numClosed: 0};
        dayPoints.set(date, point);
      }
      return point;
    }

    for (const issue of this.issues) {
      dayPoint(issue.openedAt).numOpened++;
      if (issue.closedAt) {
        dayPoint(issue.closedAt).numClosed++;
      }
    }

    return Array.from(dayPoints.values())
        .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Return a string summarizing the latest count of open and closed issues.
   */
  summary() {
    const total = this.issues.length;
    let open = 0;
    let closed = 0;
    for (const issue of this.issues) {
      if (issue.closedAt) {
        closed++;
      } else {
        open++;
      }
    }

    return `Found ${total} issues of which ${open} were open and ` +
        `${closed} were closed.`;
  }

  rawData() {
    const heading = `Date\t\tOpened\tClosed\n`;
    return heading + this.timeSeries().map((point) => {
      return [point.date, point.numOpened, point.numClosed].join('\t');
    }).join('\n');
  }
}

type Issue = {
  // YYYY-MM-DDThh:mm:ssZ
  openedAt: string,
  closedAt: string,
};

/**
 * Fetch all of the issues for a given repo.
 */
async function getIssues(
    github: GitHub, owner: string, name: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  const results = github.cursorQuery<IssuesQuery, IssuesQueryVariables>(
      issuesQuery,
      {owner, name},
      (data) => data.repository && data.repository.issues);

  for await (const data of results) {
    const repo = data.repository;
    if (!repo) {
      break;
    }

    for (const issue of repo.issues.nodes || []) {
      if (!issue) {
        continue;
      }

      let closedAt = '';
      if (issue.closed) {
        for (const ev of issue.timeline.nodes || []) {
          if (ev && ev.__typename === 'ClosedEvent') {
            closedAt = ev.createdAt;
            break;
          }
        }
        if (!closedAt) {
          // Edge case where we couldn't find the closed event even though
          // we're closed. This could happen if there was a lot of continuing
          // discussion after an issue was closed. Skip these issues
          // altogether.
          continue;
        }
      }

      issues.push({openedAt: issue.createdAt, closedAt});
    }
  }

  return issues;
}

const issuesQuery = gql`
  query Issues($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          createdAt
          url
          closed
          timeline(last: 20) {
            nodes {
              __typename
              ... on ClosedEvent {
                createdAt
              }
            }
          }
        }
      }
    }
  }
`;
