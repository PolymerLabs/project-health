import {test} from 'ava';
import * as fs from 'fs-extra';
import * as yamlParser from 'js-yaml';
import * as path from 'path';

test('should skip all top level directories', async (t) => {
  const WHITELIST = ['build'];

  const projectRoot = path.join(__dirname, '..', '..');
  const folderContents = await fs.readdir(projectRoot);
  const directoryNames = [];
  for (const folderItemPath of folderContents) {
    const stats = await fs.stat(path.join(projectRoot, folderItemPath));
    if (stats.isDirectory()) {
      directoryNames.push(folderItemPath);
    }
  }

  const yamlFileContents =
      await fs.readFile(path.join(projectRoot, 'app.yaml'));
  const appYaml = yamlParser.safeLoad(yamlFileContents.toString());

  const dirMissingFromSkipList = [];
  const skipFiles = appYaml.skip_files;
  for (const dirName of directoryNames) {
    if (skipFiles.indexOf(`${dirName}/`) === -1 &&
        WHITELIST.indexOf(dirName) === -1) {
      dirMissingFromSkipList.push(dirName);
    }
  }

  if (dirMissingFromSkipList.length > 0) {
    console.error(
        'There are directories in the project root which aren\'t ' +
        'skipped or whitelisted.');
    console.error(dirMissingFromSkipList);
    t.fail();
  } else {
    t.pass();
  }
});
