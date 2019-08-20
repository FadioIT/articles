import React, { useEffect, useState, useRef } from 'react';
import Worker from './faceapi.worker.js';

const App = () => {
  const [video, setVideo] = useState(undefined);
  const [canvas, setCanvas] = useState(undefined);
  const [detected, setDetected] = useState(false);
  const [worker, setWorker] = useState(undefined);
  const workerInit = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const resolvers = useRef({});
  const count = useRef(0);

  const handleWorkerMessage = ({ data }) => {
    switch (data.msg) {
      case 'init':
        workerResolveMessage(data.id, data);
        workerInit.current = true;
        break;
      case 'detected':
        workerResolveMessage(data.id, data);
        setDetected(data.value);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    setWorker(new Worker());
  }, []);

  useEffect(() => {
    (async () => {
      if (worker) {
        worker.onmessage = handleWorkerMessage;
      }

      setVideo(videoRef.current);
      setCanvas(canvasRef.current);
      if (video && canvas && worker) {
        await workerPostMessage({ msg: 'init' });
        await launchCamera();
        const recognition = makeRecognition();
        await recognition.init();
        recognition.start();
      }
    })();
  }, [video, canvas, worker]);

  const workerPostMessage = (msg, array) => {
    const id = count.current++;
    worker.postMessage({ ...msg, id }, array);
    return new Promise(resolve => (resolvers.current[id] = resolve));
  };

  const workerResolveMessage = (id, data) => {
    resolvers.current[id](data);
    delete resolvers.current[id];
  };

  const makeRecognition = () => {
    let ctx;

    const init = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx = canvas.getContext('2d');
    };

    const start = async () => {
      await wait(0);
      if (video.readyState === 4 && workerInit.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data.buffer;
        await workerPostMessage(
          {
            msg: 'detect',
            pixels,
            width: canvas.width,
            height: canvas.height,
          },
          [pixels],
        );
      }
      start();
    };

    return { init, start };
  };

  const launchCamera = () =>
    new Promise(resolve => {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            mandatory: {
              minWidth: 320,
              maxWidth: 320,
              minHeight: 240,
              maxHeight: 240,
              minFrameRate: 1,
              maxFrameRate: 10,
            },
          },
        })
        .then(
          stream => {
            video.srcObject = stream;
            video.play();
            resolve();
          },
          () => {},
        );
    });

  return (
    <div>
      <video
        style={{ position: 'absolute', top: 70, left: 10 }}
        ref={videoRef}
      />
      <canvas
        style={{ position: 'absolute', top: 350, left: 10 }}
        ref={canvasRef}
      />
      <h2>Face Detected : {detected ? 'True' : 'False'}</h2>
    </div>
  );
};

const wait = time => new Promise(resolve => setTimeout(resolve, time));

export default App;
