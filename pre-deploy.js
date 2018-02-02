/**
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

'use strict';

const {promisify} = require('util');
const execFile = promisify(require('child_process').execFile);
const fse = require('fs-extra');
const glob = promisify(require('glob'));

/**
 * grpc comes with a native extension that is built upon install. However,
 * unless we happen to be deploying from the exact same architecture that we are
 * deploying to, we need to recompile it for App Engine. This should be a
 * non-issue once App Engine runs `npm install` for us.
 */
async function recompileGrpcExtension() {
  // There could be multiple versions of the grpc package installed, so check
  // both our top-level node_modules, and any nested ones.
  const grpcDirs = await glob('./node_modules/{grpc/,**/node_modules/grpc/}');
  const args = [
    'install',
    '--fallback-to-build',
    '--library=static_library',
    '--target_arch=x64',
    '--target_platform=linux',
    '--runtime=node',
    '--target=8.9.0',
    '--target_libc=glibc',
  ];
  for (const grpcDir of grpcDirs) {
    console.log(`rebuilding grpc extension at ${grpcDir}`);
    await execFile('./node_modules/.bin/node-pre-gyp', args, {cwd: grpcDir});
  }
}

/**
 * We have a 20K file limit for App Engine. Our node_modules gets us close to
 * this limit. Delete all unnecessary files to buy us some time. This should be
 * a non-issue once App Engine runs `npm install` for us.
 */
async function pruneDeps() {
  const allFiles = await glob('./node_modules/**/*', {nodir: true});
  const pruneFiles =
      allFiles.filter((file) => !file.match(/\.(js|json|node|pem|proto)$/));
  console.log(`deleting ${pruneFiles.length} / ${
      allFiles.length} unnecessary files from node_modules`);
  await Promise.all(pruneFiles.map((file) => fse.remove(file)));
}

async function preDeploy() {
  await recompileGrpcExtension();
  await pruneDeps();
};

preDeploy();
