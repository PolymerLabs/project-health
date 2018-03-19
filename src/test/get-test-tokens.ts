import * as fs from 'fs-extra';
import * as path from 'path';

export function getTestTokens() {
  const filePath = path.join(__dirname, '..', '..', 'tokens.json');
  try {
    return fs.readJSONSync(filePath);
  } catch (err) {
    if (process.env.RECORD === 'true') {
      throw new Error(
          'Unable to find tokens.json, which is required ' +
          'for recording.');
    }

    return {
      'project-health1': '',
    };
  }
}
