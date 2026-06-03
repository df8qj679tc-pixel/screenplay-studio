var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_sql = __toESM(require("sql.js"), 1);
var import_vite = require("vite");

// src/ai/types.ts
var fallback = (value, defaultValue) => {
  return typeof value === "string" && value.trim() ? value.trim() : defaultValue;
};

// src/ai/brainstormSkill.ts
var SYSTEM_PROMPT = [
  "You are a professional story development room for Chinese-language screenplays.",
  "Your job is divergent ideation: generate bold, playable, high-conflict story options.",
  "Always write the final answer in natural Simplified Chinese.",
  "Do not mention AI, models, DeepSeek, prompts, policies, or instructions.",
  "Do not write generic advice. Every idea must be specific enough to become a scene.",
  "Favor contradiction, dramatic irony, secrets, reversals, moral pressure, and visual set pieces.",
  "Avoid vague mood words, literary padding, and abstract themes without plot action."
].join("\n");
function buildBrainstormPrompt(input) {
  const title = fallback(input.title, "Untitled screenplay");
  const outline = fallback(input.outline, "No outline provided");
  const currentContext = fallback(input.currentContext, "No current scene context provided");
  const tone = fallback(input.tone, "cinematic, character-driven, clear conflict");
  return {
    skill: "brainstorm",
    temperature: 0.9,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          "Task: generate exactly 3 screenplay brainstorm ideas.",
          "Return only the 3 ideas. No introduction and no closing note.",
          "Each idea must use this compact structure in Simplified Chinese:",
          "1. Title line",
          "Core conflict: ...",
          "Scene tension: ...",
          "Story direction: ...",
          "",
          "Make the ideas different from each other in premise, stakes, and ending path.",
          "",
          `<title>${title}</title>`,
          `<outline>${outline}</outline>`,
          `<current_context>${currentContext}</current_context>`,
          `<tone>${tone}</tone>`
        ].join("\n")
      }
    ]
  };
}

// src/ai/continueSkill.ts
var SYSTEM_PROMPT2 = [
  "You are a continuation writer for Chinese-language screenplays.",
  "Your job is to write the next beat, not to summarize, brainstorm, or explain.",
  "Always write the final answer in natural Simplified Chinese.",
  "Return only continuation text. No greeting, no commentary, no markdown, no title unless the continuation needs a scene heading.",
  "Do not mention AI, models, DeepSeek, prompts, policies, or instructions.",
  "Honor the existing tone, continuity, character intent, scene logic, and unresolved tension.",
  "Prefer visible action, precise blocking, subtextual dialogue, and a clear escalation.",
  "Write 1 to 2 screenplay paragraphs unless the context clearly requires a short dialogue exchange.",
  "Do not repeat the screenplay context or last selected paragraph verbatim.",
  "Do not resolve the central conflict too quickly. Continue the momentum."
].join("\n");
function buildContinuePrompt(input) {
  const screenplayContext = fallback(input.screenplayContext, "No screenplay context provided");
  const lastScene = fallback(input.lastScene, "No selected paragraph provided");
  return {
    skill: "continue",
    temperature: 0.72,
    messages: [
      { role: "system", content: SYSTEM_PROMPT2 },
      {
        role: "user",
        content: [
          "Task: continue the screenplay from the context.",
          "Output only 1 to 2 polished screenplay paragraphs in Simplified Chinese.",
          "Continue from the last selected paragraph when it helps.",
          "Start after the last selected paragraph; do not repeat it.",
          "",
          `<screenplay_context>${screenplayContext}</screenplay_context>`,
          `<last_selected_paragraph>${lastScene}</last_selected_paragraph>`
        ].join("\n")
      }
    ]
  };
}

// src/ai/polishSkill.ts
var SYSTEM_PROMPT3 = [
  "You are a senior dialogue polish editor for Chinese-language screenplays.",
  "Your job is controlled rewriting, not brainstorming.",
  "Always write the final answer in natural Simplified Chinese.",
  "Return only the polished text. No explanation, labels, markdown, or before-after comparison.",
  "Do not mention AI, models, DeepSeek, prompts, policies, or instructions.",
  "Do not claim source text is empty when text appears inside <original_text>.",
  "Preserve the original meaning, speaker intent, continuity, names, and facts unless the instruction says otherwise.",
  "Improve subtext, rhythm, specificity, character voice, and screen playability.",
  "Cut filler. Avoid over-writing, purple prose, web-novel phrasing, and generic inspirational lines."
].join("\n");
function buildPolishPrompt(input) {
  const instruction = fallback(input.instruction, "Make it more specific, cinematic, character-driven, and playable while preserving the original meaning.");
  return {
    skill: "polish",
    temperature: 0.45,
    messages: [
      { role: "system", content: SYSTEM_PROMPT3 },
      {
        role: "user",
        content: [
          "Task: polish the screenplay text inside <original_text>.",
          "Important: the text inside <original_text> is the source text. It is not missing.",
          "Output only the polished text in Simplified Chinese.",
          "",
          `<instruction>${instruction}</instruction>`,
          `<original_text>${input.text}</original_text>`
        ].join("\n")
      }
    ]
  };
}

// src/utils/exportText.ts
function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function convertHtmlToMarkdownText(html, screenplayName = "screenplay", savedAt) {
  const savedTime = savedAt ? new Date(savedAt).toLocaleString() : new Date().toLocaleString();
  const paragraphs = Array.from(html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi));
  const lines = [`# ${screenplayName}`, "", `Saved: ${savedTime}`, "", "---", ""];
  for (const match of paragraphs) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const typeMatch = attrs.match(/data-type=["']([^"']+)["']/i);
    const type = typeMatch?.[1] || "action";
    const text = stripHtml(body);
    if (!text) {
      lines.push("");
      continue;
    }
    switch (type) {
      case "scene-heading":
        lines.push(`## ${text}`, "");
        break;
      case "character":
        lines.push(`**${text}**`, "");
        break;
      case "dialogue":
        lines.push(`> ${text}`, "");
        break;
      case "parenthetical":
        lines.push(`> *(${text})*`, "");
        break;
      default:
        lines.push(text, "");
        break;
    }
  }
  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n";
}

import_dotenv.default.config({ path: process.env.ENV_FILE || ".env.local" });
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
var DEEPSEEK_BASE_URL = "https://api.deepseek.com";
var DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
var LEGACY_DRAFTS_DIR = process.env.LEGACY_DRAFTS_DIR || process.env.DRAFTS_DIR || import_path.default.join(process.cwd(), "drafts");
var DEFAULT_DATA_DIR = process.env.SCREENPLAY_DATA_DIR || import_path.default.join(process.cwd(), "drafts");
var SCREENPLAY_DB_PATH = process.env.SCREENPLAY_DB_PATH || import_path.default.join(DEFAULT_DATA_DIR, "screenplay-studio.sqlite");
var MARKDOWN_BACKUP_DIR = process.env.MARKDOWN_BACKUP_DIR || import_path.default.join(DEFAULT_DATA_DIR, "markdown-backups");
var SQLJS_WASM_PATH = process.env.SQLJS_WASM_PATH || "";
var APP_DIST_DIR = process.env.APP_DIST_DIR || __dirname;
app.use(import_express.default.json({ limit: "5mb" }));
var draftDatabasePromise = null;
function safeFilename(value) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-").slice(0, 80) || "screenplay";
}
function isValidDraft(value) {
  if (!value || typeof value !== "object") return false;
  const draft = value;
  return typeof draft.id === "string" && typeof draft.title === "string" && typeof draft.content === "string" && typeof draft.createdAt === "string" && typeof draft.updatedAt === "string";
}
async function writeFileIfChanged(filePath, content) {
  try {
    const existing = await import_promises.default.readFile(filePath);
    const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (existing.equals(next)) return false;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await import_promises.default.writeFile(filePath, content);
  return true;
}
function getSqlWasmPath() {
  if (SQLJS_WASM_PATH) return SQLJS_WASM_PATH;
  return require.resolve("sql.js/dist/sql-wasm.wasm");
}
function stripBom(value) {
  return value.replace(/^\uFEFF/, "");
}
async function getDraftDatabase() {
  if (!draftDatabasePromise) draftDatabasePromise = initializeDraftDatabase();
  return draftDatabasePromise;
}
async function initializeDraftDatabase() {
  await import_promises.default.mkdir(import_path.default.dirname(SCREENPLAY_DB_PATH), { recursive: true });
  const SQL = await (0, import_sql.default)({ locateFile: () => getSqlWasmPath() });
  let db;
  try {
    const databaseBytes = await import_promises.default.readFile(SCREENPLAY_DB_PATH);
    db = new SQL.Database(databaseBytes);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const drafts = readDraftsFromDatabase(db);
  if (drafts.length === 0) {
    const legacySnapshot = await readLegacyDraftSnapshot();
    if (legacySnapshot.drafts.length > 0) writeDraftsToDatabase(db, legacySnapshot.drafts, legacySnapshot.activeDraftId);
  }
  await persistDatabase(db);
  await syncMarkdownBackups(readDraftsFromDatabase(db));
  return { db, initializedAt: new Date().toISOString() };
}
async function persistDatabase(db) {
  await import_promises.default.mkdir(import_path.default.dirname(SCREENPLAY_DB_PATH), { recursive: true });
  const bytes = Buffer.from(db.export());
  const tempPath = `${SCREENPLAY_DB_PATH}.tmp`;
  await import_promises.default.writeFile(tempPath, bytes);
  await import_promises.default.rename(tempPath, SCREENPLAY_DB_PATH);
}
function readDraftsFromDatabase(db) {
  const result = db.exec("SELECT id, title, content, createdAt, updatedAt FROM drafts ORDER BY updatedAt DESC, createdAt DESC");
  if (!result[0]) return [];
  return result[0].values.map((row) => ({ id: String(row[0] || ""), title: String(row[1] || ""), content: String(row[2] || ""), createdAt: String(row[3] || ""), updatedAt: String(row[4] || "") })).filter(isValidDraft);
}
function readActiveDraftIdFromDatabase(db, drafts) {
  const result = db.exec("SELECT value FROM app_state WHERE key = 'activeDraftId' LIMIT 1");
  const storedActiveId = result[0]?.values?.[0]?.[0];
  const activeDraftId = typeof storedActiveId === "string" ? storedActiveId : "";
  return drafts.some((draft) => draft.id === activeDraftId) ? activeDraftId : drafts[0]?.id || "";
}
function writeDraftsToDatabase(db, drafts, activeDraftId) {
  const normalizedActiveDraftId = drafts.some((draft) => draft.id === activeDraftId) ? activeDraftId : drafts[0]?.id || "";
  db.run("BEGIN TRANSACTION");
  try {
    db.run("DELETE FROM drafts");
    const insertDraft = db.prepare("INSERT INTO drafts (id, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)");
    try {
      drafts.forEach((draft) => insertDraft.run([draft.id, draft.title, draft.content, draft.createdAt, draft.updatedAt]));
    } finally {
      insertDraft.free();
    }
    db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('activeDraftId', ?)", [normalizedActiveDraftId]);
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}
async function readLegacyDraftSnapshot() {
  try {
    const raw = await import_promises.default.readFile(import_path.default.join(LEGACY_DRAFTS_DIR, "drafts.json"), "utf8");
    const parsed = JSON.parse(stripBom(raw));
    const drafts = Array.isArray(parsed?.drafts) ? parsed.drafts.filter(isValidDraft) : [];
    const requestedActiveId = typeof parsed?.activeDraftId === "string" ? parsed.activeDraftId : "";
    const activeDraftId = drafts.some((draft) => draft.id === requestedActiveId) ? requestedActiveId : drafts[0]?.id || "";
    return { drafts, activeDraftId };
  } catch (error) {
    if (error?.code !== "ENOENT") console.warn("Legacy draft import skipped:", error.message || error);
    return { drafts: [], activeDraftId: "" };
  }
}
async function syncMarkdownBackups(drafts) {
  await import_promises.default.mkdir(MARKDOWN_BACKUP_DIR, { recursive: true });
  const expectedMarkdownFiles = new Set(drafts.map((draft) => `${safeFilename(draft.title)}-${draft.id}.md`));
  const existingFiles = await import_promises.default.readdir(MARKDOWN_BACKUP_DIR);
  await Promise.all(existingFiles.filter((filename) => filename.endsWith(".md") && !expectedMarkdownFiles.has(filename)).map((filename) => import_promises.default.rm(import_path.default.join(MARKDOWN_BACKUP_DIR, filename), { force: true })));
  await Promise.all(drafts.map(async (draft) => {
    const filename = `${safeFilename(draft.title)}-${draft.id}.md`;
    const markdown = convertHtmlToMarkdownText(draft.content, draft.title, draft.updatedAt);
    await writeFileIfChanged(import_path.default.join(MARKDOWN_BACKUP_DIR, filename), `\uFEFF${markdown}`);
  }));
}
async function callDeepSeek(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY. Please configure it in .env.local.");
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages: prompt.messages, temperature: prompt.temperature })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `DeepSeek API request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek API did not return usable text.");
  return text.trim();
}
app.get("/api/health", async (req, res) => {
  try {
    await getDraftDatabase();
    res.json({ status: "ok", provider: "deepseek", model: DEEPSEEK_MODEL, skills: ["brainstorm", "polish", "continue"], database: SCREENPLAY_DB_PATH, markdownBackups: MARKDOWN_BACKUP_DIR, time: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message || "Database failed to initialize." });
  }
});
app.get("/api/drafts/load", async (req, res) => {
  try {
    const { db } = await getDraftDatabase();
    const drafts = readDraftsFromDatabase(db);
    const activeDraftId = readActiveDraftIdFromDatabase(db, drafts);
    res.json({ ok: true, activeDraftId, drafts, database: SCREENPLAY_DB_PATH, markdownBackups: MARKDOWN_BACKUP_DIR });
  } catch (error) {
    console.error("Draft load failed:", error);
    res.status(500).json({ error: error.message || "Draft load failed." });
  }
});
app.post("/api/drafts/sync", async (req, res) => {
  try {
    const drafts = Array.isArray(req.body?.drafts) ? req.body.drafts : [];
    const activeDraftId = typeof req.body?.activeDraftId === "string" ? req.body.activeDraftId : "";
    const validDrafts = drafts.filter(isValidDraft);
    const { db } = await getDraftDatabase();
    writeDraftsToDatabase(db, validDrafts, activeDraftId);
    await persistDatabase(db);
    await syncMarkdownBackups(validDrafts);
    res.json({ ok: true, count: validDrafts.length, database: SCREENPLAY_DB_PATH, markdownBackups: MARKDOWN_BACKUP_DIR });
  } catch (error) {
    console.error("Draft sync failed:", error);
    res.status(500).json({ error: error.message || "Draft sync failed." });
  }
});
app.post("/api/ai/brainstorm", async (req, res) => {
  try {
    const prompt = buildBrainstormPrompt(req.body);
    const text = await callDeepSeek(prompt);
    res.json({ skill: prompt.skill, text });
  } catch (error) {
    console.error("DeepSeek Brainstorm Error:", error);
    res.status(500).json({ error: error.message || "Brainstorm request failed." });
  }
});
app.post("/api/ai/polish", async (req, res) => {
  try {
    const { text, instruction } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Please provide screenplay text to polish." });
    const prompt = buildPolishPrompt({ text, instruction });
    const polishedText = await callDeepSeek(prompt);
    res.json({ skill: prompt.skill, text: polishedText });
  } catch (error) {
    console.error("DeepSeek Polish Error:", error);
    res.status(500).json({ error: error.message || "Polish request failed." });
  }
});
app.post("/api/ai/continue", async (req, res) => {
  try {
    const prompt = buildContinuePrompt(req.body);
    const text = await callDeepSeek(prompt);
    res.json({ skill: prompt.skill, text });
  } catch (error) {
    console.error("DeepSeek Continue Error:", error);
    res.status(500).json({ error: error.message || "Continue request failed." });
  }
});
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting backend in DEVELOPMENT mode with Vite Middleware...");
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    console.log("Starting backend in PRODUCTION mode...");
    const distPath = APP_DIST_DIR;
    const indexPath = import_path.default.join(distPath, "index.html");
    try {
      await import_promises.default.access(indexPath);
    } catch {
      console.error(`Frontend index.html was not found at ${indexPath}`);
    }
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (error) => {
        if (error) res.status(500).send(`Frontend files were not found. Expected index.html at: ${indexPath}`);
      });
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Screenplay Studio custom server listening at http://0.0.0.0:${PORT}`);
  });
}
setupViteOrStatic();
//# sourceMappingURL=server.cjs.map
