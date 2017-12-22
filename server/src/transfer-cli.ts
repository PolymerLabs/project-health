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
import * as request from 'request-promise-native';

// tslint:disable-next-line:no-require-imports no-any
const commandLineUsage = require('command-line-usage') as any;

const argDefs = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Print this help text',
  },
  {
    name: 'token',
    alias: 't',
    type: String,
    description:
        'GitHub access token to perform this transfer. Must have the "repo" scope.',
  },
  {
    name: 'force',
    alias: 'f',
    type: Boolean,
    defaultValue: false,
    description: 'Force transfer to happen',
  },
  {
    name: 'from',
    type: String,
    description: 'Org to move these repos from',
  },
  {
    name: 'to',
    type: String,
    description: 'Org to move these repos to',
  },
];

/**
 * Input is a list of repos (1 per line)
 */
function readInput(): Promise<string[]> {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('readable', () => {
      input += process.stdin.read() || '';
    });

    process.stdin.on('end', () => {
      resolve(input.split('\n').filter((x) => x !== ''));
    });
  });
}

/**
 * Returns whether or not the repo uses GitHub pages.
 */
function hasGitHubPages(
    org: string, repo: string, token: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    request
        .get({
          url: `https://api.github.com/repos/${org}/${repo}`,
          headers: {
            'Accept': 'application/json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
          },
          json: true,
        })
        .then((result) => {
          // Check that this wasn't redirected.
          if (result.owner.login !== org) {
            reject(`Error: ${repo} was not found in ${org} and instead in ${
                result.owner.login}`);
            return;
          }
          if (result.has_pages) {
            console.log(`[Warning] ${
                repo} uses GitHub pages. This will not be transferred.`);
          }
          resolve(result.has_pages);
        })
        .catch((err) => {
          if (err.statusCode === 404) {
            reject(`Error: ${org}/${repo} not found`);
          } else {
            reject(err);
          }
        });
  });
}

/**
 * Starts the transfer of a repo. Transfer is asynchronous on GitHub's side.
 */
function transferRepo(from: string, to: string, repo: string, token: string) {
  return new Promise((resolve, reject) => {
    request
        .post({
          url: `https://api.github.com/repos/${from}/${repo}/transfer`,
          headers: {
            'Accept': 'application/vnd.github.nightshade-preview+json',
            'Authorization': `token ${token}`,
            'User-Agent': 'Project Health Bot',
          },
          body: {
            new_owner: to,
          },
          json: true,
        })
        .then(() => {
          resolve();
        })
        .catch((err) => {
          console.error(err);
          reject(`Unable to transfer ${from}/${repo}`);
        });
  });
}

export async function run(argv: string[]) {
  const args = commandLineArgs(argDefs, {argv});

  if (args.help) {
    console.log(commandLineUsage([
      {
        header: `[blue]{Project Health transfer script}`,
        content: 'https://github.com/PolymerLabs/project-health',
      },
      {
        header: `Options`,
        optionList: argDefs,
      }
    ]));
    return;
  }

  if (!args.token) {
    console.error('No GitHub token provided. Use --token.');
    return;
  }

  if (!args.from || !args.to) {
    console.error('You must specify where to move the repo to and from.');
    return;
  }

  const repos = await readInput();
  let spinner = ora(`Preparing to transfer ${repos.length} repos`).start();

  const checks = [];
  for (const repo of repos) {
    checks.push(hasGitHubPages(args.from, repo, args.token));
  }

  try {
    await Promise.all(checks);
    spinner.stop();

    console.log(`Ready to transfer ${repos.length} repositories from ${
        args.from} to ${args.to}`);

    if (!args.force) {
      console.log('Rerun with -f to transfer');
    } else {
      spinner = ora(`Transferring ${repos.length} repos`).start();
      for (const repo of repos) {
        await transferRepo(args.from, args.to, repo, args.token);
      }
      spinner.stop();
      console.log(`Transferred ${repos.length} repositories from ${
          args.from} to ${args.to}`);
    }
  } catch (err) {
    spinner.stop();
    console.error(err);
  }
}
