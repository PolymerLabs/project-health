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

/**
 * This file offers a consistent way to copy files from `src/` to `build/`.
 */

'use strict';

const globCb = require('glob');
const {promisify} = require('util');
const path = require('path');
const fse = require('fs-extra');

const glob = promisify(globCb);

const copyFiles = async (globPattern) => {
  const filesToCopy = await glob(globPattern, {absolute: true});
  for (const fileToCopy of filesToCopy) {
    const stats = await fse.stat(fileToCopy);
    if (stats.isDirectory()) {
      continue;
    }

    const relativePath = path.relative(path.join(__dirname, 'src'), fileToCopy);
    const buildPath = path.join(__dirname, 'build', relativePath);
    await fse.ensureDir(path.dirname(buildPath));
    await fse.copy(fileToCopy, buildPath);
  }
};

const copyAssetFiles = async () => {
  await copyFiles('./src/**/*.{html,js,json,css,png}');
};

const build = async () => {
  await copyAssetFiles();
};

build();
