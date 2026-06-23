import { Router } from "express";
import multer from "multer";
import { toFile } from "openai";
import { requireAuth } from "../middleware/auth.js";
import { qwen, MODELS } from "../lib/qwen.js";
import { env } from "../config/env.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

/**
 * POST /api/voice/transcribe  (protected, multipart "audio")
 * Speech-to-text via Qwen ASR. Tries the dedicated transcription model first;
 * falls back to the multimodal Omni model if needed.
 */
router.post("/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio uploaded" });
      return;
    }
    const buffer = req.file.buffer;
    const mime = req.file.mimetype || "audio/wav";

    // 1) dedicated ASR model
    try {
      const file = await toFile(buffer, req.file.originalname || "audio.wav", { type: mime });
      const result = await qwen.audio.transcriptions.create({ file, model: MODELS.asr });
      res.json({ text: (result.text ?? "").trim() });
      return;
    } catch (asrErr) {
      console.warn("ASR model failed, trying Omni:", (asrErr as Error).message);
    }

    // 2) fallback: Omni multimodal chat with audio input
    const b64 = buffer.toString("base64");
    const completion = await qwen.chat.completions.create({
      model: MODELS.omni,
      modalities: ["text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio exactly as spoken. Return only the transcription, nothing else." },
            { type: "input_audio", input_audio: { data: `data:audio/wav;base64,${b64}`, format: "wav" } },
          ],
        },
      ],
    } as any);
    const raw = completion.choices[0]?.message?.content;
    const text = Array.isArray(raw) ? raw.map((p: any) => p.text ?? "").join("") : (raw ?? "");
    res.json({ text: String(text).trim() });
  } catch (err) {
    console.error("transcribe error:", (err as Error).message ?? err);
    res.status(500).json({ error: "Could not transcribe the audio" });
  }
});

/**
 * POST /api/voice/speak  (protected, JSON { text })
 * Kredex talks back: Qwen TTS (qwen3-tts-flash) renders the text to speech.
 * We proxy the audio bytes so the client gets a same-origin, https-safe stream.
 */
router.post("/speak", requireAuth, async (req, res) => {
  try {
    const raw = String((req.body as { text?: string })?.text ?? "");
    // strip markdown/emoji noise so it isn't read aloud
    const text = raw.replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 900);
    if (!text) {
      res.status(400).json({ error: "No text to speak" });
      return;
    }

    const base = env.QWEN_BASE_URL.replace("/compatible-mode/v1", "");
    const gen = await fetch(`${base}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.QWEN_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELS.tts, input: { text, voice: "Cherry" } }),
    });
    const data: any = await gen.json();
    const url: string | undefined = data?.output?.audio?.url;
    if (!url) {
      console.error("tts no url:", JSON.stringify(data).slice(0, 200));
      res.status(502).json({ error: "Could not generate speech" });
      return;
    }

    const audio = await fetch(url);
    const buf = Buffer.from(await audio.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (err) {
    console.error("speak error:", (err as Error).message ?? err);
    res.status(500).json({ error: "Could not generate speech" });
  }
});

export default router;
