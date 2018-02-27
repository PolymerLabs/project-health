import * as ava from 'ava';
import * as fs from 'fs-extra';
import * as jimp from 'jimp';
import * as path from 'path';
import {PNG} from 'pngjs';
import * as puppeteer from 'puppeteer';

// Pixelmatch doesn't export a module, so we need to use require.
// tslint:disable-next-line:no-require-imports
import pixelmatch = require('pixelmatch');
// tslint:disable-next-line:no-require-imports
import mergeImg = require('merge-img');

const goldensRoot = path.join(__dirname, '..', 'goldens');

/**
 * Given paths to two images, will return whether or not the two images are the
 * same. Writes a diff image as well.
 */
function imagesMatch(
    path1: string, path2: string, diffPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img1 =
        fs.createReadStream(path1).pipe(new PNG()).on('parsed', doneReading);
    const img2 =
        fs.createReadStream(path2).pipe(new PNG()).on('parsed', doneReading);
    let filesRead = 0;

    function doneReading() {
      if (++filesRead < 2) {
        return;
      }

      if (img1.width !== img2.width || img1.height !== img2.height) {
        resolve(false);
      }

      const diff = new PNG({width: img1.width, height: img1.height});
      const threshold = process.env.TRAVIS === 'TRUE' ? 0.5 : 0.1;
      const matches = pixelmatch(
                          img1.data,
                          img2.data,
                          diff.data,
                          img1.width,
                          img1.height,
                          {threshold}) === 0;

      // Write out diff file.
      diff.pack().pipe(fs.createWriteStream(diffPath)).on('finish', () => {
        resolve(matches);
      });
    }
  });
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
    // Check expected golden exists.
    t.true(
        await fs.pathExists(expectedPath),
        `Golden file not found, run in rebaseline mode to generate golden:
        npm run test:rebaseline -- --match '${t.title}'`);

    const actualPath = path.resolve(goldensRoot, `${title}-actual.png`);
    const diffPath = path.resolve(goldensRoot, `${title}-diff.png`);
    const previewPath = path.resolve(goldensRoot, `${title}-preview.png`);

    await page.screenshot({path: actualPath, fullPage: true});
    const matches = await imagesMatch(actualPath, expectedPath, diffPath);

    // Write out a combined image of actual, expected, diff for easy viewing.
    if (!matches) {
      const img: jimp = await mergeImg([actualPath, expectedPath, diffPath]);
      if (process.env.TRAVIS === 'true') {
        console.log(await jimpBase64(img));
      } else {
        await writeJimp(img, previewPath);
      }
    }

    t.true(matches, `Screenshot does not match golden.
    View diff:
      google-chrome ${previewPath}
    To rebaseline:
      npm run test:rebaseline -- --match '${t.title}'`);
  } else {
    // Generate new golden file.
    await page.screenshot({path: expectedPath, fullPage: true});
    console.info(`💾 Generated golden at ${expectedPath}`);
  }
}

/**
 * Promisified version of writing a jimp to a file.
 */
function writeJimp(jimp: jimp, imgPath: string): Promise<void> {
  return new Promise((resolve) => {
    jimp.write(imgPath, () => resolve());
  });
}

// This any is required since typings for this function are not yet released.
// tslint:disable-next-line:no-any
function jimpBase64(img: any): Promise<string> {
  return new Promise((resolve) => {
    // tslint:disable-next-line:no-any
    img.getBase64('image/png', (_error: any, src: any) => {
      resolve(src);
    });
  });
}
