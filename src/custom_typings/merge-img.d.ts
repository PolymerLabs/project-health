declare module 'merge-img' {
import {Jimp} from 'jimp';

  function mergeImg(
      images: Array<string|
                    {src: string | Buffer, offsetX?: number, offsetY?: number}|
                    Buffer|Jimp>,
      options?: {
        direction?: boolean,
        color?: number,
        align?: 'start'|'center'|'end',
        offset?: number,
        margin?: number|string|
              {top?: number, right?: number, bottom?: number, left?: number},
      }): Promise<Jimp>;

  export = mergeImg;
}
