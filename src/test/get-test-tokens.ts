import * as fs from 'fs-extra';
import * as path from 'path';

export function getTestTokens() {
  const filePath = path.join(__dirname, '..', '..', 'tokens.json');
  try {
    return fs.readJSONSync(filePath);
  } catch (err) {
    return {
      'project-health1': '',
    };
  }
}
