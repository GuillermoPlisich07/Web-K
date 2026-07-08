/**
 * AudioWorklet processor — reemplaza el ScriptProcessorNode (deprecated).
 * Corre en el hilo de audio, downsamplea al target rate y envía al hilo principal.
 */
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const targetRate = (options.processorOptions && options.processorOptions.targetRate) || 16000;
    this._ratio = sampleRate / targetRate;
    this._buffer = [];
    this._chunkSize = 4096;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    // Decimación simple al target rate
    const outLen = Math.round(channel.length / this._ratio);
    for (let i = 0; i < outLen; i++) {
      this._buffer.push(channel[Math.round(i * this._ratio)]);
    }

    if (this._buffer.length >= this._chunkSize) {
      const chunk = new Float32Array(this._buffer.splice(0, this._chunkSize));
      this.port.postMessage(chunk.buffer, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
