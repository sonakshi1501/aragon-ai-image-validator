import * as blazeface from "@tensorflow-models/blazeface";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

let model: blazeface.BlazeFaceModel | null = null;
let tfReady = false;

async function ensureTensorFlow(): Promise<void> {
  if (tfReady) return;
  await tf.setBackend("cpu");
  await tf.ready();
  tfReady = true;
}

async function getModel(): Promise<blazeface.BlazeFaceModel> {
  await ensureTensorFlow();
  if (!model) {
    model = await blazeface.load();
  }
  return model;
}

export interface FaceAnalysis {
  faceCount: number;
  largestFaceAreaRatio: number;
}

async function bufferToFaceTensor(
  imageBuffer: Buffer
): Promise<{ tensor: tf.Tensor3D; width: number; height: number }> {
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgbData = new Uint8Array(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 3) {
    rgbData[j] = data[i];
    rgbData[j + 1] = data[i + 1];
    rgbData[j + 2] = data[i + 2];
  }

  return {
    tensor: tf.tensor3d(rgbData, [info.height, info.width, 3]),
    width: info.width,
    height: info.height,
  };
}

export async function analyzeFaces(imageBuffer: Buffer): Promise<FaceAnalysis> {
  const faceModel = await getModel();
  const { tensor, width, height } = await bufferToFaceTensor(imageBuffer);

  try {
    const predictions = await faceModel.estimateFaces(tensor, false);
    const imageArea = width * height;
    let largestFaceAreaRatio = 0;

    for (const prediction of predictions) {
      const topLeft = prediction.topLeft as [number, number];
      const bottomRight = prediction.bottomRight as [number, number];
      const boxWidth = bottomRight[0] - topLeft[0];
      const boxHeight = bottomRight[1] - topLeft[1];
      const ratio = (boxWidth * boxHeight) / imageArea;
      if (ratio > largestFaceAreaRatio) {
        largestFaceAreaRatio = ratio;
      }
    }

    return {
      faceCount: predictions.length,
      largestFaceAreaRatio,
    };
  } finally {
    tensor.dispose();
  }
}

export async function ensureModelsDownloaded(): Promise<void> {
  await getModel();
}
