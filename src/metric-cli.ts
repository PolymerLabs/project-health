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

import {GitHub} from './gql';
import {getReviewLatency} from './metrics/review-latency';

const argDefs = [
  {
    name: 'metric',
    type: String,
    description: 'Name of the metric to measure',
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
    description: 'Owner/name of the GitHub repo to measure',
  },
];

export async function run(argv: string[]) {
  const args = commandLineArgs(argDefs, {argv});

  if (!args.metric) {
    throw new Error('No metric specified');
  }

  if (!args.org) {
    throw new Error('No GitHub org specified');
  }

  const github = new GitHub();

  if (args.metric === 'review-latency') {
    console.info((await getReviewLatency(github, args)).format());
  }
}
