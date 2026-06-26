import * as blazeface from "@tensorflow-models/blazeface";
import * as tf from "@tensorflow/tfjs-node";
import sharp from "sharp";

let model: blazeface.BlazeFaceModel | null = null;

async function getModel(): Promise<blazeface.BlazeFaceModel> {
  if (!model) {
    model = await blazeface.load();
  }
  return model;
}

export interface FaceAnalysis {
  faceCount: number;
  largestFaceAreaRatio: number;
}

export async function analyzeFaces(imageBuffer: Buffer): Promise<FaceAnalysis> {
  const faceModel = await getModel();
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgbData = new Uint8Array(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 3) {
    rgbData[j] = data[i];
    rgbData[j + 1] = data[i + 1];
    rgbData[j + 2] = data[i + 2];
  }

  const tensor = tf.tensor3d(rgbData, [info.height, info.width, 3]);
  const predictions = await faceModel.estimateFaces(tensor, false);
  tensor.dispose();

  const imageArea = info.width * info.height;
  let largestFaceAreaRatio = 0;

  for (const prediction of predictions) {
    const topLeft = prediction.topLeft as [number, number];
    const bottomRight = prediction.bottomRight as [number, number];
    const width = bottomRight[0] - topLeft[0];
    const height = bottomRight[1] - topLeft[1];
    const ratio = (width * height) / imageArea;
    if (ratio > largestFaceAreaRatio) {
      largestFaceAreaRatio = ratio;
    }
  }

  return {
    faceCount: predictions.length,
    largestFaceAreaRatio,
  };
}

export async function ensureModelsDownloaded(): Promise<void> {
  await getModel();
}
