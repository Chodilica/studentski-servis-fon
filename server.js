import express from "express";
 
const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(express.static("public")); // ovde ide index.html
 
const KEY = process.env.OPENROUTER_API_KEY;
// Jedan ili više modela odvojenih zarezom; probaju se redom ako prvi zakaže.
const MODELS = (process.env.OPENROUTER_MODEL || "openrouter/free,google/gemma-4-31b-it:free")
 .split(",").map((s) => s.trim()).filter(Boolean);
 
if (!KEY) console.warn("UPOZORENJE: OPENROUTER_API_KEY nije postavljen (.env fajl).");
 
app.post("/api/chat", async (req, res) => {
 const system = String(req.body.system || "").slice(0, 20000);
 const history = (req.body.messages || []).slice(-5);
 const messages = [{ role: "system", content: system }, ...history];
 
 let lastError = "nepoznata greška";
 // Dva kruga: ako su svi modeli privremeno zauzeti (429), sačeka se i proba ponovo.
 for (let round = 0; round < 2; round++) {
 if (round) await new Promise((ok) => setTimeout(ok, 2500));
 for (const model of MODELS) {
 try {
 const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
 method: "POST",
 headers: {
 "content-type": "application/json",
 authorization: `Bearer ${KEY}`,
 "HTTP-Referer": "http://localhost:3000",
 "X-Title": "Studentski Servis FON",
 },
 body: JSON.stringify({ model, messages, max_tokens: 600 }),
 });
 const data = await r.json();
 const reply = data.choices?.[0]?.message?.content;
 if (r.ok && reply) return res.json({ reply, model });
 lastError = `${model}: ${JSON.stringify(data.error || data)}`;
 console.warn("Model nije uspeo ->", lastError);
 } catch (e) {
 lastError = `${model}: ${e}`;
 console.warn("Greška ->", lastError);
 }
 }
 }
 res.status(502).json({ error: lastError });
});
 
app.listen(3000, () => console.log("Sajt: http://localhost:3000"));