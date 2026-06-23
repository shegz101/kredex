/**
 * Convert a recorded audio Blob (browser MediaRecorder gives webm/opus or mp4)
 * into a 16 kHz mono 16-bit WAV — the format Qwen ASR reliably accepts. Decoding
 * happens via the Web Audio API, so no server-side transcoding is needed.
 */
export async function blobToWav(blob: Blob, targetRate = 16000): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer()
  const AudioCtx: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  const decoded = await ctx.decodeAudioData(arrayBuf)
  await ctx.close()

  // mix down to mono
  const len = decoded.length
  const chans = decoded.numberOfChannels
  const mono = new Float32Array(len)
  for (let c = 0; c < chans; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < len; i++) mono[i] += data[i] / chans
  }

  // resample to targetRate (simple linear pick)
  const ratio = decoded.sampleRate / targetRate
  const outLen = Math.max(1, Math.floor(len / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) out[i] = mono[Math.floor(i * ratio)] ?? 0

  return encodeWavPCM16(out, targetRate)
}

function encodeWavPCM16(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}
