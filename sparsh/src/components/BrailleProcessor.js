import { decodeSequence } from './BrailleDecoder.js';

function inferGrid(blobs) {
  if (blobs.length < 6) return [];
  blobs.sort((a, b) => a.y - b.y);
  const yDists = [];
  for (let i = 1; i < blobs.length; i++) {
    const d = blobs[i].y - blobs[i - 1].y;
    if (d > 2) yDists.push(d);
  }
  yDists.sort((a, b) => a - b);
  const dotSpacing = yDists[Math.floor(yDists.length / 2)] || 20;
  const rows = [];
  let currentRow = [blobs[0]];
  for (let i = 1; i < blobs.length; i++) {
    if (blobs[i].y - currentRow[0].y < dotSpacing * 0.6) {
      currentRow.push(blobs[i]);
    } else {
      rows.push(currentRow);
      currentRow = [blobs[i]];
    }
  }
  rows.push(currentRow);
  const cells = [];
  for (let r = 0; r + 2 < rows.length; r += 3) {
    const triplet = [...rows[r], ...rows[r + 1], ...rows[r + 2]];
    triplet.sort((a, b) => a.x - b.x);
    const xVals = triplet.map((b) => b.x);
    const midX = (Math.min(...xVals) + Math.max(...xVals)) / 2;
    const left = triplet.filter((b) => b.x < midX).sort((a, b) => a.y - b.y);
    const right = triplet.filter((b) => b.x >= midX).sort((a, b) => a.y - b.y);
    const bits = [
      left[0] ? '1' : '0',
      left[1] ? '1' : '0',
      left[2] ? '1' : '0',
      right[0] ? '1' : '0',
      right[1] ? '1' : '0',
      right[2] ? '1' : '0',
    ];
    cells.push(bits.join(''));
  }
  return cells;
}

const DARK_THRESHOLD = 60;
const BRIGHT_THRESHOLD = 200;
const BLUR_THRESHOLD = 100;

export class BrailleProcessor {
  async init() {
    return new Promise((resolve) => {
      const check = () => {
        const cv = window.cv;
        if (
          cv &&
          cv.Mat &&
          cv.matFromImageData &&
          cv.cvtColor &&
          cv.adaptiveThreshold &&
          cv.morphologyEx &&
          cv.findContours &&
          cv.contourArea &&
          cv.minEnclosingCircle
        ) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  processFrame(imageData) {
    if (!window.cv || !window.cv.Mat) {
      return { chars: [], blobs: [], guidance: 'OpenCV not ready', confidence: [], rawString: '' };
    }

    // Validate imageData
    if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
      console.error('Invalid imageData:', {
        hasData: !!imageData?.data,
        width: imageData?.width,
        height: imageData?.height,
        dataLength: imageData?.data?.length,
      });
      return { chars: [], blobs: [], guidance: 'Invalid frame data', confidence: [], rawString: '' };
    }

    const cv = window.cv;
    let src;
    let gray;
    let claheOut;
    let thresh;
    let closed;
    let kernel;
    let lap;
    let mean;
    let stddev;

    try {
      src = cv.matFromImageData(imageData);
      gray = new cv.Mat();
      claheOut = new cv.Mat();
      thresh = new cv.Mat();
      closed = new cv.Mat();
      kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      lap = new cv.Mat();
      mean = new cv.Mat();
      stddev = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // OpenCV.js 4.x exposes CLAHE via the cv.CLAHE constructor (not cv.createCLAHE).
      // Some builds also expose a factory; try both, fall back to plain gray.
      let clahe = null;
      try {
        if (typeof cv.CLAHE === 'function') {
          clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        } else if (cv.createCLAHE && typeof cv.createCLAHE === 'function') {
          clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
        }
      } catch (e) {
        clahe = null;
      }
      if (clahe) {
        try {
          clahe.apply(gray, claheOut);
        } catch (e) {
          console.warn('CLAHE apply failed, using gray directly:', e);
          gray.copyTo(claheOut);
        } finally {
          try { clahe.delete(); } catch (_) {}
        }
      } else {
        gray.copyTo(claheOut);
      }

      cv.adaptiveThreshold(
        claheOut,
        thresh,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        11,
        2
      );

      cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);

      // Custom blob detection using contours (SimpleBlobDetector not available in this OpenCV.js build)
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const blobs = [];
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        // Filter by area (Braille dots are typically 20-400 px²)
        if (area < 20 || area > 400) continue;

        // Find the minimum enclosing circle
        const circle = cv.minEnclosingCircle(contour);
        const center = circle.center;
        const radius = circle.radius;

        // Filter by circularity (estimate: area / (π * r²) should be close to 1)
        const circularity = area / (Math.PI * radius * radius);
        if (circularity < 0.6) continue; // Too non-circular

        blobs.push({ x: center.x, y: center.y, r: radius });
      }

      contours.delete();
      hierarchy.delete();

      const cells = inferGrid([...blobs]);
      const decoded = decodeSequence(cells);
      const chars = decoded.text.split('');
      const confidence = decoded.confidence.length
        ? decoded.confidence
        : cells.map((cell) => cell.split('').filter((v) => v === '1').length / 6);
      const rawString = decoded.text;

      cv.Laplacian(gray, lap, cv.CV_64F);
      cv.meanStdDev(lap, mean, stddev);
      const variance = stddev.data64F[0] * stddev.data64F[0];
      const brightness = cv.mean(gray)[0];

      let guidance = 'Point camera at Braille';
      if (brightness < DARK_THRESHOLD) guidance = 'Too dark';
      else if (brightness > BRIGHT_THRESHOLD) guidance = 'Too bright';
      else if (variance < BLUR_THRESHOLD) guidance = 'Hold steady';
      else if (blobs.length > 0) guidance = 'Braille detected';
      else guidance = 'No Braille - adjust angle';

      return { chars, blobs, guidance, confidence, rawString };
    } catch (error) {
      console.error('BrailleProcessor error:', error?.message || error, {
        stack: error?.stack,
        imageDataWidth: imageData?.width,
        imageDataHeight: imageData?.height,
      });
      return { chars: [], blobs: [], guidance: 'Frame processing error', confidence: [], rawString: '' };
    } finally {
      if (stddev) stddev.delete();
      if (mean) mean.delete();
      if (lap) lap.delete();
      if (kernel) kernel.delete();
      if (closed) closed.delete();
      if (thresh) thresh.delete();
      if (claheOut) claheOut.delete();
      if (gray) gray.delete();
      if (src) src.delete();
    }
  }
}
