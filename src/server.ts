/*
 * Copyright 2018 Google Inc. All rights reserved.
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

import * as fse from 'fs-extra';
import * as path from 'path';

import {DashServer} from './server/dash-server';
import {GitHub} from './utils/github';

const buildDir = __dirname;

async function launch() {
  const secrets = await fse.readJSON(path.join(buildDir, 'secrets.json'));

  // See https://cloud.google.com/docs/authentication/production
  for (const file of await fse.readdir(buildDir)) {
    if (file.match(/^github-health-.*\.json$/)) {
      console.log('using gcloud credentials file', file);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(buildDir, file);
      break;
    }
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
        'no gcloud credentials file found;',
        'using application default credentials');
  }

  const server = new DashServer(new GitHub(), secrets);
  server.listen();
}

// Display stack traces for uncaught errors.
function logError(err: Error) {
  console.error(err);
  throw err;
}
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

launch();
