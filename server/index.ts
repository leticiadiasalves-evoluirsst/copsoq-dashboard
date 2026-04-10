import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Data persistence (JSON file) ──────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, "..", "data");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, "[]", "utf-8");
  }
}

function readResponses(): unknown[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(RESPONSES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeResponses(data: unknown[]) {
  ensureDataDir();
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // JSON body parser
  app.use(express.json({ limit: "5mb" }));

  // ─── API Routes ─────────────────────────────────────────────────────────

  // GET /api/responses — Retrieve all saved responses
  app.get("/api/responses", (_req, res) => {
    try {
      const responses = readResponses();
      res.json(responses);
    } catch (err) {
      res.status(500).json({ error: "Erro ao ler respostas." });
    }
  });

  // POST /api/responses — Save a new questionnaire response
  app.post("/api/responses", (req, res) => {
    try {
      const body = req.body;
      if (!body || !body.respostas) {
        return res.status(400).json({ error: "Dados inválidos." });
      }

      const responses = readResponses();
      const newId = responses.length > 0
        ? Math.max(...(responses as any[]).map((r: any) => r.id || 0)) + 1
        : 1;

      const newResponse = {
        id: newId,
        empresa: (body.empresa || "").trim(),
        setor: (body.setor || "").trim(),
        funcao: (body.funcao || "").trim(),
        nome: (body.nome || "").trim(),
        respostas: body.respostas,
        submittedAt: new Date().toISOString(),
      };

      responses.push(newResponse);
      writeResponses(responses);

      res.status(201).json(newResponse);
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar resposta." });
    }
  });

  // DELETE /api/responses/:id — Delete a specific response
  app.delete("/api/responses/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      let responses = readResponses() as any[];
      const before = responses.length;
      responses = responses.filter((r: any) => r.id !== id);
      if (responses.length === before) {
        return res.status(404).json({ error: "Resposta não encontrada." });
      }
      writeResponses(responses);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir resposta." });
    }
  });

  // ─── Static files ───────────────────────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
