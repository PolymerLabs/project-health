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

import * as commandLineArgs from 'command-line-args';
import * as ora from 'ora';

import {initGithub} from '../utils/github';

import {getIssueCounts} from './metrics/issue-counts';
import {getReviewCoverage} from './metrics/review-coverage';
import {getReviewLatency} from './metrics/review-latency';
import {getStars} from './metrics/stars';

// tslint:disable-next-line:no-require-imports no-any
const commandLineUsage = require('command-line-usage') as any;

initGithub();

const argDefs = [
  {
    name: 'help',
    type: Boolean,
    description: 'Print this help text',
  },
  {
    name: 'metric',
    type: String,
    description:
        'Name of the metric to measure (review-latency, issue-counts, stars)',
  },
  {
    name: 'raw',
    type: Boolean,
    defaultValue: false,
    description: 'Dumps the raw data relevant to the provided metric',
  },
  {
    name: 'org',
    type: String,
    description: 'Name of the GitHub org to measure',
  },
  {
    name: 'repo',
    type: String,
    description: 'Optional. Owner/name of the GitHub repo to measure',
  },
  {
    name: 'days',
    type: Number,
    description: 'Number of days before today to start calculating from',
  },
];

export async function run(argv: string[]) {
  const args = commandLineArgs(argDefs, {argv});

  if (args.help) {
    console.log(commandLineUsage([
      {
        header: '[blue]{Project Health metrics}',
        content: 'https://github.com/PolymerLabs/project-health',
      },
      {
        header: 'Options',
        optionList: argDefs,
      }
    ]));
    return;
  }

  if (!args.metric) {
    throw new Error('No metric specified');
  }

  if (!args.org) {
    throw new Error('No GitHub org specified');
  }

  const metricSpinner = ora(`Gathering '${args.metric}' metric data`).start();

  let metricResult;
  const orgInfo = {org: args.org, repo: args.repo};

  const since = new Date();
  if (!args.days) {
    console.log(
        'Defaulting to 1 year time period. Use --days to specify number of days');
  }
  since.setDate(since.getDate() - (args.days || 365));

  switch (args.metric) {
    case 'review-latency':
      metricResult = await getReviewLatency({...orgInfo, since});
      break;
    case 'issue-counts':
      metricResult = await getIssueCounts({...orgInfo, since});
      break;
    case 'review-coverage':
      metricResult =
          await getReviewCoverage({org: args.org, repo: args.repo, since});
      break;
    case 'stars':
      metricResult = await getStars({org: args.org, repo: args.repo});
      break;
    default:
      metricSpinner.fail('Metric not found.');
      throw new Error('Metric not found');
  }

  metricSpinner.stop();

  if (!args.raw) {
    console.log(metricResult.summary());
  } else {
    console.log(metricResult.rawData());
  }
}
