import {test} from 'ava';
import * as crypto from 'crypto';
import * as fsExtra from 'fs-extra';
import * as glob from 'glob';
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
  t.deepEqual(hash, '8233d87d6d9acd9585a7ee72131fa197');
});

test(
    'imports should end in .js in client to work with modules in the browser',
    async (t) => {
      const typescriptFiles = glob.sync('**/*.ts', {
        cwd: path.join(__dirname, '..', '..', 'src', 'client'),
        absolute: true,
      });

      const badFiles = [];
      for (const tsFile of typescriptFiles) {
        const contents = (await fsExtra.readFile(tsFile)).toString();

        const badImports = [];

        const regex = /import.*from.*'(.*)';/g;
        let match;
        while (match = regex.exec(contents)) {
          if (match[1].indexOf('.js') !== match[1].length - 3) {
            badImports.push(match[0]);
          }
        }

        if (badImports.length > 0) {
          badFiles.push({
            filename: tsFile,
            imports: badImports,
          });
        }
      }
      if (badFiles.length > 0) {
        console.log(
            'Found client files that are missing the \'.js\' extension on import');
        for (const badFile of badFiles) {
          console.log(`File: ${badFile.filename}`);
          for (const badImport of badFile.imports) {
            console.log(`    Import: ${badImport}`);
          }
        }
      }

      t.pass();
    });
