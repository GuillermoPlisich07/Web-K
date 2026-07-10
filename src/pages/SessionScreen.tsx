import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { FaceAnalyzer, type FaceMetrics } from "../services/FaceAnalyzer";
import audioProcessorUrl from "../audio/audio-processor.js?url";

const FASTAPI_BASE = import.meta.env.VITE_FASTAPI_URL ?? "http://localhost:8000";
const FASTAPI_WS = FASTAPI_BASE.replace(/^http/, "ws");
const FASTAPI_URL = FASTAPI_BASE;
const SAMPLE_RATE = 16000;
const BIOMETRIC_INTERVAL_MS = 500;
const NTC_INTERVAL_MS = 100;

const emotionColor: Record<string, string> = {
  joy: "text-yellow-400", happiness: "text-yellow-400",
  nervousness: "text-orange-400", fear: "text-orange-400",
  anger: "text-red-400", sadness: "text-blue-400",
  confidence: "text-green-400", neutral: "text-slate-400",
  nervioso: "text-orange-400", ansioso: "text-orange-400",
  confiado: "text-green-400", tenso: "text-red-300",
};

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}


export default function SessionScreen() {
  const navigate = useNavigate();
  const { sessionId, scenarioId, vendorName, transcript, currentEmotion,
          isAvatarSpeaking, elapsedSeconds, tavusConversationUrl, delegatedToken, addTranscriptEntry,
          setCurrentEmotion, setIsAvatarSpeaking, incrementElapsed } = useSessionStore();

  const wsRef = useRef<WebSocket | null>(null);
  const wsBioRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextAudioStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceAnalyzerRef = useRef<FaceAnalyzer | null>(null);
  const latestFaceMetricsRef = useRef<FaceMetrics | null>(null);
  const confidenceRef = useRef(0);
  const stressRef = useRef(0);
  const engagementRef = useRef(0);
  const reconnectCountRef = useRef(0);
  const reconnectBioCountRef = useRef(0);
  const sessionEndedRef = useRef(false);
  const pausedRef = useRef(false);
  const isAvatarSpeakingRef = useRef(false);
  const avatarTextRef = useRef("");
  const audioCtxClosedRef = useRef(false);
  const ntcTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [partialTranscript, setPartialTranscript] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  const [avatarText, setAvatarText] = useState("");
  const [paused, setPaused] = useState(false);
  const [micStatus, setMicStatus] = useState<"waiting" | "active" | "error">("waiting");
  const [audioLevel, setAudioLevel] = useState(0);
  const [manualText, setManualText] = useState("");
  const [wsError, setWsError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [eyeContact, setEyeContact] = useState<boolean | null>(null);
  const [headOrientation, setHeadOrientation] = useState<{ yaw: number; pitch: number; roll: number } | null>(null);
  const [faceEmotion, setFaceEmotion] = useState<string>("neutral");
  const [confidenceIndex, setConfidenceIndex] = useState<number>(0);
  const [stressIndex, setStressIndex] = useState<number>(0);
  const [blinkRate, setBlinkRate] = useState<number>(0);
  const [smileIntensity, setSmileIntensity] = useState<number>(0);
  const [backchannelIndicator, setBackchannelIndicator] = useState<string | null>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { isAvatarSpeakingRef.current = isAvatarSpeaking; }, [isAvatarSpeaking]);

  useEffect(() => {
    timerRef.current = setInterval(() => incrementElapsed(), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const connectWs = useCallback(() => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;
    const tokenParam = delegatedToken ? `?token=${encodeURIComponent(delegatedToken)}` : "";
    const ws = new WebSocket(`${FASTAPI_WS}/ws/${sessionId}${tokenParam}`);
    wsRef.current = ws;
    ws.onopen = () => { reconnectCountRef.current = 0; };
    ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        ev.data.arrayBuffer().then((buf) => {
          const text = new TextDecoder().decode(new Uint8Array(buf.slice(0, 200)));
          const sep = "|AUDIO|";
          const idx = text.indexOf(sep);
          if (idx !== -1) enqueueAudio(new Int16Array(buf.slice(idx + sep.length)));
        });
        return;
      }
      const msg = JSON.parse(ev.data);
      if (msg.type === "transcript_partial") {
        setPartialTranscript(msg.text || "");
      } else if (msg.type === "transcript_final") {
        setPartialTranscript("");
        if (msg.speaker === "vendor" && msg.text)
          addTranscriptEntry({ turn: msg.turn!, speaker: "VENDOR", text: msg.text });
      } else if (msg.type === "avatar_text") {
        avatarTextRef.current = msg.text || "";
        setAvatarText(msg.text || "");
      } else if (msg.type === "avatar_thinking") {
        setWsError(null);
        setIsAvatarSpeaking(true);
      } else if (msg.type === "avatar_audio_end") {
        setIsAvatarSpeaking(false);
        const at = avatarTextRef.current;
        if (at) {
          addTranscriptEntry({ turn: msg.turn || 0, speaker: "CLIENT", text: at });
          avatarTextRef.current = "";
          setAvatarText("");
        }
      } else if (msg.type === "emotion_update") {
        setCurrentEmotion(msg.dominant || null);
      } else if (msg.type === "avatar_backchannel") {
        const { text, audio_base64 } = msg as { text: string; audio_base64: string; tps: number };
        setBackchannelIndicator(text);
        setTimeout(() => setBackchannelIndicator(null), 1500);
        if (audio_base64) playBackchannelAudio(audio_base64);
      } else if (msg.type === "error") {
        setWsError(msg.message || "Error desconocido del servidor");
        setIsAvatarSpeaking(false);
      }
    };
    ws.onclose = (ev) => {
      if (sessionEndedRef.current) return;
      if (ev.code === 4401) {
        redirectOnAuthFailure();
        return;
      }
      if (reconnectCountRef.current >= 10) {
        setWsError("Conexion perdida. Recargá la página para continuar.");
        return;
      }
      const delay = Math.min(1000 * 2 ** reconnectCountRef.current, 30000);
      reconnectCountRef.current++;
      setTimeout(connectWs, delay);
    };
  }, [sessionId]);

  // WebSocket biometría con reconexión backoff
  const connectBioWs = useCallback(() => {
    if (!sessionId || sessionEndedRef.current) return;
    if (wsBioRef.current?.readyState === WebSocket.OPEN) return;
    const tokenParam = delegatedToken ? `?token=${encodeURIComponent(delegatedToken)}` : "";
    const ws = new WebSocket(`${FASTAPI_WS}/ws/${sessionId}/biometrics${tokenParam}`);
    wsBioRef.current = ws;
    ws.onopen = () => { reconnectBioCountRef.current = 0; };
    ws.onclose = (ev) => {
      if (sessionEndedRef.current) return;
      if (ev.code === 4401) {
        redirectOnAuthFailure();
        return;
      }
      const delay = Math.min(1000 * 2 ** reconnectBioCountRef.current, 30000);
      reconnectBioCountRef.current++;
      setTimeout(connectBioWs, delay);
    };
  }, [sessionId]);

  useEffect(() => {
    connectBioWs();
    return () => wsBioRef.current?.close();
  }, [connectBioWs]);

  // FaceAnalyzer — MediaPipe Tasks API con blendshapes
  useEffect(() => {
    if (!sessionId) return;
    const analyzer = new FaceAnalyzer();
    faceAnalyzerRef.current = analyzer;

    let mounted = true;
    analyzer.init().then(() => {
      setFaceError(null);
      bioTimerRef.current = setInterval(() => {
        if (!mounted || sessionEndedRef.current) return;
        const vid = videoRef.current;
        const ts = performance.now();
        const metrics = analyzer.isReady() && vid ? analyzer.analyze(vid, ts) : null;
        latestFaceMetricsRef.current = metrics;

        if (mounted && metrics?.faceDetected) {
          setEyeContact(metrics.lookingAtCamera);
          setHeadOrientation(metrics.headPose);
          setFaceEmotion(metrics.dominantEmotion);
          setSmileIntensity(metrics.smileIntensity);
          const indices = analyzer.computeIndices();
          confidenceRef.current = indices.confidence;
          stressRef.current = indices.stress;
          engagementRef.current = indices.engagement;
          setConfidenceIndex(indices.confidence);
          setStressIndex(indices.stress);
          setBlinkRate(analyzer.getBlinkRateBpm());
        }

        if (mounted) sendBiometricSample();
      }, BIOMETRIC_INTERVAL_MS);

      // Timer NTC: envía features faciales cada 100ms para el NTC ticker
      ntcTimerRef.current = setInterval(() => {
        if (!mounted || sessionEndedRef.current) return;
        const m = latestFaceMetricsRef.current;
        if (!wsBioRef.current || wsBioRef.current.readyState !== WebSocket.OPEN) return;
        try {
          wsBioRef.current.send(JSON.stringify({
            type: "ntc_facial",
            data: {
              gaze_at_camera: m?.lookingAtCamera ?? false,
              gaze_looking_down: m ? m.headPose.pitch < -20 : false,
              blink_rate: analyzer.getBlinkRateBpm(),
              lip_movement: m?.blendshapes
                ? ((m.blendshapes["mouthLeft"] ?? 0) + (m.blendshapes["mouthRight"] ?? 0) +
                   (m.blendshapes["mouthLowerDownLeft"] ?? 0) + (m.blendshapes["mouthLowerDownRight"] ?? 0)) / 4 > 0.05
                  && (m.blendshapes["jawOpen"] ?? 0) < 0.15
                : false,
              mouth_open: m?.mouthOpen ?? false,
              brow_furrow: m?.browFurrow ?? 0,
              dominant_emotion: m?.dominantEmotion ?? "neutral",
              head_yaw: m?.headPose.yaw ?? 0,
              head_pitch: m?.headPose.pitch ?? 0,
            },
            timestamp_ms: Date.now(),
          }));
        } catch { /* WS cerrado */ }
      }, NTC_INTERVAL_MS);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar el análisis facial";
      setFaceError(msg);
    });

    return () => {
      mounted = false;
      if (bioTimerRef.current) clearInterval(bioTimerRef.current);
      if (ntcTimerRef.current) clearInterval(ntcTimerRef.current);
      analyzer.close();
    };
  }, [sessionId]);

  function sendBiometricSample() {
    if (!wsBioRef.current || wsBioRef.current.readyState !== WebSocket.OPEN) return;
    const m = latestFaceMetricsRef.current;
    try {
      wsBioRef.current.send(JSON.stringify({
        timestamp_ms: Date.now(),
        emotions: m?.emotions ?? {},
        dominant_emotion: m?.dominantEmotion ?? null,
        eye_contact: m?.lookingAtCamera ?? null,
        head_orientation: m?.headPose ?? { yaw: 0, pitch: 0, roll: 0 },
        eye_openness: m?.eyeOpenness ?? null,
        blink_detected: m?.blinkDetected ?? null,
        smile_intensity: m?.smileIntensity ?? null,
        brow_furrow: m?.browFurrow ?? null,
        mouth_open: m?.mouthOpen ?? null,
        face_detected: m?.faceDetected ?? false,
        confidence_index: confidenceRef.current,
        stress_index: stressRef.current,
        engagement_index: engagementRef.current,
        blendshapes: m?.blendshapes ? JSON.stringify(m.blendshapes) : null,
      }));
    } catch { /* WS cerrado */ }
  }

  useEffect(() => {
    connectWs();
    startAudio();
    return () => {
      wsRef.current?.close();
      stopAudio();
    };
  }, []);

  async function startAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMicStatus("active");

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      audioCtxClosedRef.current = false;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        setAudioLevel(Math.min(100, (dataArray.reduce((a, b) => a + b, 0) / dataArray.length) * 2));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();

      await ctx.audioWorklet.addModule(audioProcessorUrl);
      const workletNode = new AudioWorkletNode(ctx, "audio-processor", {
        processorOptions: { targetRate: SAMPLE_RATE },
      });
      processorRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (pausedRef.current || isAvatarSpeakingRef.current) return;
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const float32 = new Float32Array(e.data);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++)
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        wsRef.current.send(int16.buffer);
      };

      source.connect(workletNode);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      workletNode.connect(mute);
      mute.connect(ctx.destination);
    } catch {
      setMicStatus("error");
    }
  }

  function stopAudio() {
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && !audioCtxClosedRef.current) {
      audioCtxClosedRef.current = true;
      audioCtxRef.current.close().catch(() => {});
    }
  }

  function enqueueAudio(int16: Int16Array) {
    const ctx = audioCtxRef.current;
    if (!ctx || audioCtxClosedRef.current) return;
    const f = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) f[i] = int16[i] / 32768;
    const buf = ctx.createBuffer(1, f.length, 16000);
    buf.getChannelData(0).set(f);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.01, nextAudioStartRef.current);
    src.start(startAt);
    nextAudioStartRef.current = startAt + buf.duration;
  }

  function playNext() { /* superseded by scheduled enqueueAudio */ }

  function playBackchannelAudio(base64: string) {
    const ctx = audioCtxRef.current;
    if (!ctx || audioCtxClosedRef.current) return;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = (int16[i] / 32768) * 0.6;
      const buf = ctx.createBuffer(1, float32.length, 16000);
      buf.getChannelData(0).set(float32);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch { /* AudioContext cerrado o base64 inválido */ }
  }

  function endTurn() {
    if (manualText.trim()) {
      wsRef.current?.send(JSON.stringify({ type: "end_turn", text: manualText.trim() }));
      setManualText("");
    } else {
      wsRef.current?.send(JSON.stringify({ type: "end_turn" }));
    }
  }

  function interrupt() {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextAudioStartRef.current = 0;
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
  }

  /** AI-Service-k rejected our delegated token (WS closed with 4401, or /session/end 401) — the session can't continue. */
  function redirectOnAuthFailure() {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    wsRef.current?.close();
    wsBioRef.current?.close();
    stopAudio();
    setWsError("No se pudo autenticar la sesión. Volviendo a la lista de escenarios...");
    setTimeout(() => navigate("/scenarios"), 2500);
  }

  async function endSession() {
    setIsEnding(true);
    sessionEndedRef.current = true;
    if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    try {
      wsRef.current?.close();
      stopAudio();
      const endRes = await fetch(`${FASTAPI_URL}/session/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(delegatedToken ? { Authorization: `Bearer ${delegatedToken}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (endRes.status === 401) {
        navigate("/scenarios");
        return;
      }
      navigate(`/report/${sessionId}`);
    } catch {
      navigate(`/report/${sessionId}`);
    }
  }

  const emColor = emotionColor[(currentEmotion || "neutral").toLowerCase()] || "text-slate-400";

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center">
        <p className="text-slate-400 font-mono">Sesion no iniciada. Volvé al inicio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between bg-[#0c0d18]">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-slate-500 font-mono">ESCENARIO</span>
            <p className="text-sm font-semibold text-white">{scenarioId?.slice(0, 8)}...</p>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-mono">VENDEDOR</span>
            <p className="text-sm font-semibold text-white">{vendorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-slate-500 font-mono">TIEMPO</span>
            <p className="text-lg font-mono font-bold text-accent">{formatTime(elapsedSeconds)}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-500 font-mono">TURNOS</span>
            <p className="text-lg font-mono font-bold text-white">{transcript.length}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-500 font-mono">EMOCIÓN</span>
            <p className={`text-sm font-mono font-bold capitalize ${emColor}`}>{currentEmotion || "neutral"}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono ${
            eyeContact === true ? "border-green-600 text-green-400" :
            eyeContact === false ? "border-red-700 text-red-400" :
            "border-slate-700 text-slate-500"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              eyeContact === true ? "bg-green-400" : eyeContact === false ? "bg-red-400" : "bg-slate-600"
            }`} />
            {eyeContact === true ? "CONTACTO" : eyeContact === false ? "DESVIADO" : "CAM?"}
          </div>
          <div className="flex items-center gap-2 bg-[#10111e] border border-slate-700 rounded-lg px-3 py-1.5">
            <div className={`w-2 h-2 rounded-full ${
              micStatus === "active" ? "bg-green-400 animate-pulse" :
              micStatus === "error" ? "bg-red-400" : "bg-slate-500"
            }`} />
            <span className="text-xs font-mono text-slate-400">
              {micStatus === "active" ? "MIC" : micStatus === "error" ? "ERROR" : "..."}
            </span>
            {micStatus === "active" && (
              <div className="flex gap-0.5 items-end h-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 bg-green-400 rounded-sm transition-all duration-75"
                    style={{ height: `${Math.max(2, audioLevel > i * 18 ? 14 - i * 2 : 3)}px` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {wsError && (
        <div className="bg-red-950 border-b border-red-800 px-6 py-2 flex items-center justify-between">
          <span className="text-red-300 text-sm font-mono">⚠ {wsError}</span>
          <button onClick={() => setWsError(null)} className="text-red-400 hover:text-red-200 text-xs ml-4">✕</button>
        </div>
      )}
      {faceError && (
        <div className="bg-orange-950 border-b border-orange-800 px-6 py-2 flex items-center justify-between">
          <span className="text-orange-300 text-sm font-mono">Cámara: {faceError} — el análisis facial no estará disponible</span>
          <button onClick={() => setFaceError(null)} className="text-orange-400 hover:text-orange-200 text-xs ml-4">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#07080d] border-r border-slate-800 p-8">
          <div className={`w-full max-w-md aspect-video rounded-2xl border overflow-hidden ${
            isAvatarSpeaking ? "border-accent" : "border-slate-700"
          }`}>
            {tavusConversationUrl ? (
              <iframe
                src={tavusConversationUrl}
                allow="camera; microphone; autoplay; display-capture"
                className="w-full h-full"
                title="Avatar del cliente"
              />
            ) : (
              <div className="w-full h-full bg-[#10111e] flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full bg-[#0c0d18] border-2 mx-auto mb-4 flex items-center justify-center text-3xl ${
                    isAvatarSpeaking ? "border-accent animate-pulse" : "border-slate-700"
                  }`}>🤖</div>
                  <p className="text-slate-400 text-sm font-mono">Avatar del cliente</p>
                  {isAvatarSpeaking && <p className="text-accent text-xs mt-1 animate-pulse">Respondiendo...</p>}
                </div>
              </div>
            )}
          </div>
          {backchannelIndicator && (
            <div className="mt-3 max-w-md w-full bg-[#10111e] border border-slate-600 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-slate-500 text-xs font-mono">avatar →</span>
              <span className="text-slate-300 text-sm italic">{backchannelIndicator}</span>
            </div>
          )}
          {avatarText && (
            <div className="mt-4 max-w-md w-full bg-[#10111e] border border-slate-700 rounded-xl p-4">
              <p className="text-sm text-slate-300 leading-relaxed">{avatarText}</p>
            </div>
          )}
          {headOrientation && (
            <div className="mt-3 max-w-md w-full bg-[#0c0d18] border border-slate-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              {(["yaw", "pitch", "roll"] as const).map((axis) => (
                <div key={axis}>
                  <p className="text-xs text-slate-500 font-mono uppercase">{axis}</p>
                  <p className={`text-sm font-mono font-bold ${
                    Math.abs(headOrientation[axis]) > (axis === "roll" ? 10 : 15)
                      ? "text-orange-400" : "text-green-400"
                  }`}>
                    {headOrientation[axis] > 0 ? "+" : ""}{headOrientation[axis]}°
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="w-96 flex flex-col bg-[#0c0d18]">
          <div className="p-4 border-b border-slate-800">
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full aspect-video rounded-xl bg-[#10111e] border border-slate-700 object-cover" />
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <div className={`flex items-center gap-1.5 ${emColor}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="text-xs font-mono capitalize">{faceEmotion}</span>
              </div>
              <span className={`text-xs font-mono text-right ${
                eyeContact === true ? "text-green-400" : eyeContact === false ? "text-red-400" : "text-slate-500"
              }`}>
                {eyeContact === true ? "👁 contacto" : eyeContact === false ? "👁 desviado" : ""}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-mono">CONF</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${confidenceIndex * 10}%` }} />
                </div>
                <span className="text-xs font-mono text-green-400 w-5">{confidenceIndex}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-mono">STR</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${stressIndex * 10}%` }} />
                </div>
                <span className="text-xs font-mono text-red-400 w-5">{stressIndex}</span>
              </div>
              {blinkRate > 0 && (
                <span className="text-xs font-mono text-slate-500 col-span-2">
                  👁 {blinkRate} parpadeos/min{blinkRate > 35 ? " ⚠" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Transcripcion</p>
            {transcript.map((t, i) => (
              <div key={i} className={`text-sm rounded-lg px-3 py-2 ${
                t.speaker === "VENDOR"
                  ? "bg-accent/10 border border-accent/20 text-slate-200"
                  : "bg-slate-800 border border-slate-700 text-slate-300"
              }`}>
                <span className={`text-xs font-mono mr-2 ${t.speaker === "VENDOR" ? "text-accent" : "text-cyan-400"}`}>
                  {t.speaker === "VENDOR" ? "VOS" : "CLIENTE"}
                </span>
                {t.text}
              </div>
            ))}
            {partialTranscript && (
              <div className="text-sm rounded-lg px-3 py-2 bg-accent/5 border border-accent/10 text-slate-400 italic">
                <span className="text-xs font-mono text-accent/60 mr-2">...</span>
                {partialTranscript}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 space-y-2">
            {micStatus === "active" && !manualText && (
              <div className="flex items-center gap-2 border border-slate-700 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-mono">
                  {isAvatarSpeaking ? "Avatar hablando..." : "Escuchando..."}
                </span>
              </div>
            )}
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); endTurn(); } }}
              placeholder="O escribí tu respuesta acá..." rows={2}
              className="w-full bg-[#10111e] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-accent" />
            <div className="flex gap-2">
              <button onClick={endTurn} disabled={!manualText.trim()}
                className="flex-1 bg-accent hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors">
                Enviar ↵
              </button>
              <button onClick={interrupt} disabled={!isAvatarSpeaking}
                className="bg-[#10111e] hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 transition-colors">✕</button>
            </div>
            <button onClick={() => { setPaused(!paused); pausedRef.current = !paused; }}
              className={`w-full text-sm font-medium rounded-lg px-3 py-2 transition-colors border ${
                paused ? "bg-accent/20 border-accent text-accent" : "bg-[#10111e] border-slate-700 text-slate-300"
              }`}>
              {paused ? "▶ Retomar" : "⏸ Pausar"}
            </button>
            <button onClick={endSession} disabled={isEnding}
              className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 border border-red-700 text-red-200 text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors">
              {isEnding ? "Finalizando..." : "Terminar sesion"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
