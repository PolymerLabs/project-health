import * as ava from 'ava';
import * as fs from 'fs-extra';
import * as path from 'path';
import {PNG} from 'pngjs';
import * as puppeteer from 'puppeteer';

// tslint:disable-next-line:no-require-imports
import pixelmatch = require('pixelmatch');

const goldensRoot = path.join(__dirname, '..', 'goldens');

/**
 * Given paths to two images, will return whether or not the two images are the
 * same.
 */
async function imagesMatch(path1: string, path2: string): Promise<boolean> {
  const img1 = new PNG();
  img1.data = await fs.readFile(path1);
  const img2 = new PNG();
  img2.data = await fs.readFile(path2);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return false;
  }

  return pixelmatch(img1.data, img2.data, null, img1.width, img1.height) === 0;
}

/**
 * Given a loaded browser page, will take a screenshot and compare against
 * pre-generated expectations.
 */
export async function testScreenshot(
    page: puppeteer.Page, t: ava.ExecutionContext) {
  const record = process.env.REBASELINE === 'true';

  const title = t.title.replace(/\s+/g, '-');

  const expectedPath = path.resolve(goldensRoot, `${title}-expected.png`);

  if (!record) {
    // Check expected golden exists
    t.true(
        await fs.ensureFile(expectedPath),
        `Golden file not found, run in rebaseline mode to generate golden:
        npm run test:rebaseline -- --match '${t.title}'`);

    const actualPath = path.resolve(goldensRoot, `${title}-actual.png`);
    await page.screenshot({path: actualPath, fullPage: true});

    t.true(await imagesMatch(actualPath, expectedPath));
  } else {
    // Generate new golden file.
    await page.screenshot({path: expectedPath, fullPage: true});
    console.info(`💾 Generated golden at ${expectedPath}`);
  }
}
