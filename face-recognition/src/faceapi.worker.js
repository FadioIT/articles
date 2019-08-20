import {
  env,
  loadTinyFaceDetectorModel,
  detectSingleFace,
  TinyFaceDetectorOptions,
} from 'face-api.js';

import * as canvas from 'canvas';

const { CanvasRenderingContext2D } = canvas;

self.HTMLVideoElement = function() {};
self.HTMLImageElement = function() {};
self.HTMLCanvasElement = OffscreenCanvas;

const init = async () => {
  env.setEnv({
    Canvas: OffscreenCanvas || class {},
    Image: class {},
    CanvasRenderingContext2D: CanvasRenderingContext2D || class {},
    ImageData,
    Video: class {},
    createCanvasElement: () => new OffscreenCanvas(512, 512),
    createImageElement: () => {
      throw new Error('Image not available');
    },
    fetch,
    readFile: () => {
      throw new Error(
        'readFile - filesystem not available for browser environment',
      );
    },
  });

  await loadTinyFaceDetectorModel(`${global.location.origin}/src/models`);
};

const detect = async ({ width, height, pixels, options = {} }) => {
  const canvas = new OffscreenCanvas(width, height);
  canvas
    .getContext('2d')
    .putImageData(
      new ImageData(new Uint8ClampedArray(pixels), width, height),
      0,
      0,
    );
  const detected = !!(await detectSingleFace(
    canvas,
    new TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.5,
      ...options,
    }),
  ));
  return detected;
};

self.addEventListener('message', async event => {
  const { data } = event;

  switch (data.msg) {
    case 'init':
      await init();
      postMessage({ msg: 'init', id: data.id });
      break;
    case 'detect':
      const { height, width, pixels } = data;
      const detected = await detect({ width, height, pixels });
      postMessage({ msg: 'detected', value: detected, id: data.id });
      break;
    default:
      break;
  }
});
