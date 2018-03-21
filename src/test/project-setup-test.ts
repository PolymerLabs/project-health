import {test} from 'ava';
import * as crypto from 'crypto';
import * as fsExtra from 'fs-extra';
import * as path from 'path';


test('should skip all top level directories', async (t) => {
  const WHITELIST = ['build'];

  const projectRoot = path.join(__dirname, '..', '..');
  const folderContents = await fsExtra.readdir(projectRoot);
  const directoryNames = [];
  for (const folderItemPath of folderContents) {
    const stats = await fsExtra.stat(path.join(projectRoot, folderItemPath));
    if (stats.isDirectory()) {
      directoryNames.push(folderItemPath);
    }
  }

  const dirMissingFromSkipList = [];
  const gcloudIgnore =
      await fsExtra.readFile(path.join(projectRoot, '.gcloudignore'));
  const skipLines = gcloudIgnore.toString().split('\n');
  for (const dirName of directoryNames) {
    if (skipLines.indexOf(`${dirName}/`) === -1 &&
        WHITELIST.indexOf(dirName) === -1) {
      dirMissingFromSkipList.push(dirName);
    }
  }

  if (dirMissingFromSkipList.length > 0) {
    t.fail(
        `These directories in the project root aren't skipped or whitelisted: ${
            dirMissingFromSkipList}`);
  } else {
    t.pass();
  }
});

test('should have up-to-date secrets', async (t) => {
  const secretsPath = path.join(__dirname, '..', '..', 'secrets.json');
  try {
    await fsExtra.access(secretsPath);
  } catch (err) {
    // Error thrown meaning either the file doesn't exist or we can't read it
    t.pass();
    return;
  }

  const fileBuffer = await fsExtra.readFile(secretsPath);
  const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
  t.deepEqual(hash, '6b9bc61e46a73a91a6e2901a242e7dc9');
});
