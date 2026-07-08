/**
 * FaceAnalyzer — MediaPipe Tasks Vision API
 * Reemplaza @mediapipe/face_mesh (legacy) con FaceLandmarker + blendshapes.
 * Corre en el hilo principal; migrar a Web Worker en producción.
 */

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceEmotions {
  happy: number;
  surprised: number;
  angry: number;
  fearful: number;
  disgusted: number;
  sad: number;
  neutral: number;
}

export interface FaceMetrics {
  faceDetected: boolean;
  emotions: FaceEmotions;
  dominantEmotion: string;
  emotionIntensity: number;
  headPose: HeadPose;
  eyeOpenness: number;
  blinkDetected: boolean;
  smileIntensity: number;
  smileGenuine: boolean;
  browFurrow: number;
  mouthOpen: boolean;
  lookingAtCamera: boolean;
  confidenceIndex: number;
  stressIndex: number;
  engagementIndex: number;
  blendshapes?: Record<string, number>;
}

const TASKS_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

interface BlinkState {
  prevLeft: number;
  prevRight: number;
  count: number;
  windowStart: number;
}

export class FaceAnalyzer {
  private landmarker: any = null;
  private ready = false;
  private blink: BlinkState = { prevLeft: 0, prevRight: 0, count: 0, windowStart: Date.now() };
  private samples: FaceMetrics[] = [];

  async init(): Promise<void> {
    try {
      const cdnUrl: string = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { FaceLandmarker, FilesetResolver } = await import(/* @vite-ignore */ cdnUrl);
      const resolver = await FilesetResolver.forVisionTasks(TASKS_CDN);
      this.landmarker = await FaceLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      this.ready = true;
    } catch (err) {
      console.warn("[FaceAnalyzer] init failed:", err);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  analyze(video: HTMLVideoElement, timestamp: number): FaceMetrics | null {
    if (!this.ready || !this.landmarker) return null;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      const result = this.landmarker.detectForVideo(video, timestamp);
      if (!result.faceLandmarks?.length) return this._empty();

      const lm = result.faceLandmarks[0];
      const bs = this._bsMap(result.faceBlendshapes?.[0]?.categories ?? []);

      const emotions = this._emotions(bs);
      const dominant = this._dominant(emotions);
      const headPose = this._headPose(lm);
      const eyeOpenness = 1 - (bs.eyeBlinkLeft + bs.eyeBlinkRight) / 2;
      const blinkDetected = this._blink(bs.eyeBlinkLeft, bs.eyeBlinkRight);
      const smileIntensity = (bs.mouthSmileLeft + bs.mouthSmileRight) / 2;
      const smileGenuine = smileIntensity > 0.3 && (bs.cheekSquintLeft + bs.cheekSquintRight) / 2 > 0.2;
      const browFurrow = (bs.browDownLeft + bs.browDownRight) / 2;

      const metrics: FaceMetrics = {
        faceDetected: true,
        emotions,
        dominantEmotion: dominant,
        emotionIntensity: round3(emotions[dominant as keyof FaceEmotions] ?? 0),
        headPose,
        eyeOpenness: round3(eyeOpenness),
        blinkDetected,
        smileIntensity: round3(smileIntensity),
        smileGenuine,
        browFurrow: round3(browFurrow),
        mouthOpen: (bs.jawOpen ?? 0) > 0.1,
        lookingAtCamera: Math.abs(headPose.yaw) < 15 && Math.abs(headPose.pitch) < 20,
        confidenceIndex: 0,
        stressIndex: 0,
        engagementIndex: 0,
        blendshapes: bs,
      };

      this.samples.push(metrics);
      return metrics;
    } catch {
      return null;
    }
  }

  computeIndices(): { confidence: number; stress: number; engagement: number } {
    const n = this.samples.length;
    if (n === 0) return { confidence: 0, stress: 0, engagement: 0 };

    const ratio = (pred: (m: FaceMetrics) => boolean) =>
      this.samples.filter(pred).length / n;

    const lookingR  = ratio((m) => m.lookingAtCamera);
    const smileR    = ratio((m) => m.smileIntensity > 0.2);
    const relaxedR  = ratio((m) => m.browFurrow < 0.2);
    const blinkNormR = ratio((m) => !m.blinkDetected);
    const talkingR  = ratio((m) => m.mouthOpen);
    const expressR  = ratio((m) => m.dominantEmotion !== "neutral" && m.emotionIntensity > 0.3);
    const furrowR   = 1 - relaxedR;
    const blinkExR  = 1 - blinkNormR;
    const fearSadR  = ratio((m) => m.dominantEmotion === "fearful" || m.dominantEmotion === "sad");

    return {
      confidence: round1(Math.min(10, lookingR * 3 + smileR * 2 + relaxedR * 2 + blinkNormR * 2 + (lookingR > 0.7 ? 1 : 0))),
      engagement: round1(Math.min(10, talkingR * 4 + lookingR * 4 + expressR * 2)),
      stress:     round1(Math.min(10, furrowR * 3 + blinkExR * 2 + fearSadR * 3)),
    };
  }

  flushSamples(): void {
    this.samples = [];
  }

  getBlinkRateBpm(): number {
    const mins = (Date.now() - this.blink.windowStart) / 60000;
    return mins > 0 ? Math.round(this.blink.count / mins) : 0;
  }

  async close(): Promise<void> {
    if (this.landmarker) {
      try { await this.landmarker.close(); } catch { /* noop */ }
      this.landmarker = null;
      this.ready = false;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _bsMap(cats: Array<{ categoryName: string; score: number }>): Record<string, number> {
    const m: Record<string, number> = {};
    for (const c of cats) m[c.categoryName] = c.score;
    return m;
  }

  private _emotions(bs: Record<string, number>): FaceEmotions {
    const g = (k: string) => bs[k] ?? 0;
    const happy     = Math.min(1, (g("mouthSmileLeft") + g("mouthSmileRight")) / 2 + (g("cheekSquintLeft") + g("cheekSquintRight")) / 4);
    const surprised = Math.min(1, (g("browInnerUp") + g("browOuterUpLeft")) / 2 + g("jawOpen") * 0.5);
    const angry     = Math.min(1, (g("browDownLeft") + g("browDownRight")) / 2 + g("noseSneerLeft") * 0.3);
    const fearful   = Math.min(1, g("browInnerUp") * 0.6 + g("eyeWideLeft") * 0.4);
    const disgusted = Math.min(1, (g("noseSneerLeft") + g("noseSneerRight")) / 2);
    const sad       = Math.min(1, (g("mouthFrownLeft") + g("mouthFrownRight")) / 2);
    const neutral   = Math.max(0, 1 - Math.max(happy, surprised, angry, fearful, disgusted, sad) * 1.2);
    return { happy: round3(happy), surprised: round3(surprised), angry: round3(angry), fearful: round3(fearful), disgusted: round3(disgusted), sad: round3(sad), neutral: round3(neutral) };
  }

  private _dominant(e: FaceEmotions): string {
    return (Object.entries(e) as [string, number][]).reduce((a, b) => b[1] > a[1] ? b : a, ["neutral", 0])[0];
  }

  private _headPose(lm: Array<{ x: number; y: number; z: number }>): HeadPose {
    if (lm.length < 454) return { yaw: 0, pitch: 0, roll: 0 };
    const nose = lm[1], left = lm[234], right = lm[454];
    const w = right.x - left.x;
    const cx = (left.x + right.x) / 2;
    return {
      yaw:   w > 0 ? round1(((nose.x - cx) / w) * 90) : 0,
      pitch: round1((nose.y - 0.4) * 60),
      roll:  round1(Math.atan2(right.y - left.y, right.x - left.x) * (180 / Math.PI)),
    };
  }

  private _blink(left: number, right: number): boolean {
    const thr = 0.5;
    const fired = (this.blink.prevLeft < thr && left >= thr) || (this.blink.prevRight < thr && right >= thr);
    if (fired) this.blink.count++;
    this.blink.prevLeft = left;
    this.blink.prevRight = right;
    return fired;
  }

  private _empty(): FaceMetrics {
    return {
      faceDetected: false,
      emotions: { happy: 0, surprised: 0, angry: 0, fearful: 0, disgusted: 0, sad: 0, neutral: 1 },
      dominantEmotion: "neutral", emotionIntensity: 0,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      eyeOpenness: 1, blinkDetected: false, smileIntensity: 0,
      smileGenuine: false, browFurrow: 0, mouthOpen: false,
      lookingAtCamera: false, confidenceIndex: 0, stressIndex: 0, engagementIndex: 0,
    };
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
