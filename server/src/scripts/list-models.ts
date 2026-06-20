import { qwen } from "../lib/qwen.js";
const res = await qwen.models.list();
const ids = res.data.map((m: any) => m.id).sort();
console.log("Available models (" + ids.length + "):");
for (const id of ids) console.log("  " + id);
