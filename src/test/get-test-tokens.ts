import * as fs from 'fs-extra';
import * as path from 'path';

export function getTestTokens() {
  const filePath = path.join(__dirname, '..', '..', 'tokens.json');
  try {
    return fs.readJSONSync(filePath);
  } catch (err) {
    console.log('Unable to read tokens.json file, using empty strings.');
    return {
      'project-health1': '',
    };
  }
}
