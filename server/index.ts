import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuração do Banco de Dados (PostgreSQL ou Fallback JSON) ─────────
const DATABASE_URL = process.env.DATABASE_URL;
let sql: any = null;

if (DATABASE_URL) {
  sql = neon(DATABASE_URL);
  console.log("Usando banco de dados PostgreSQL (Neon Serverless).");
} else {
  console.log("DATABASE_URL não definida. Usando fallback para arquivo JSON.");
}

// ─── Data persistence (JSON file fallback) ─────────────────────────────────
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

function readResponsesJson(): any[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(RESPONSES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeResponsesJson(data: any[]) {
  ensureDataDir();
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Inicialização do Banco de Dados ───────────────────────────────────────
async function initDb() {
  if (!sql) return;
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        empresa TEXT,
        setor TEXT,
        funcao TEXT,
        nome TEXT,
        respostas JSONB,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log("Tabela 'responses' verificada/criada com sucesso no PostgreSQL.");
  } catch (err) {
    console.error("Erro ao inicializar tabela no PostgreSQL:", err);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Inicializar DB se aplicável
  await initDb();

  // JSON body parser
  app.use(express.json({ limit: "5mb" }));

  // ─── API Routes ─────────────────────────────────────────────────────────

  // GET /api/responses — Retrieve all saved responses
  app.get("/api/responses", async (_req, res) => {
    try {
      if (sql) {
        const rows = await sql`SELECT * FROM responses ORDER BY id ASC`;
        // Mapear snake_case (submitted_at) para camelCase (submittedAt) como o frontend espera
        const responses = rows.map((row: any) => ({
          id: row.id,
          empresa: row.empresa,
          setor: row.setor,
          funcao: row.funcao,
          nome: row.nome,
          respostas: row.respostas,
          submittedAt: row.submitted_at
        }));
        res.json(responses);
      } else {
        const responses = readResponsesJson();
        res.json(responses);
      }
    } catch (err) {
      console.error("Erro GET /api/responses:", err);
      res.status(500).json({ error: "Erro ao ler respostas." });
    }
  });

  // POST /api/responses — Save a new questionnaire response
  app.post("/api/responses", async (req, res) => {
    try {
      const body = req.body;
      if (!body || !body.respostas) {
        return res.status(400).json({ error: "Dados inválidos." });
      }

      if (sql) {
        const rows = await sql`
          INSERT INTO responses (empresa, setor, funcao, nome, respostas) 
          VALUES (
            ${(body.empresa || "").trim()}, 
            ${(body.setor || "").trim()}, 
            ${(body.funcao || "").trim()}, 
            ${(body.nome || "").trim()}, 
            ${body.respostas}
          ) RETURNING *
        `;
        const row = rows[0];
        const newResponse = {
          id: row.id,
          empresa: row.empresa,
          setor: row.setor,
          funcao: row.funcao,
          nome: row.nome,
          respostas: row.respostas,
          submittedAt: row.submitted_at
        };
        res.status(201).json(newResponse);
      } else {
        const responses = readResponsesJson();
        const newId = responses.length > 0
          ? Math.max(...responses.map((r: any) => r.id || 0)) + 1
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
        writeResponsesJson(responses);

        res.status(201).json(newResponse);
      }
    } catch (err) {
      console.error("Erro POST /api/responses:", err);
      res.status(500).json({ error: "Erro ao salvar resposta." });
    }
  });

  // DELETE /api/responses/:id — Delete a specific response
  app.delete("/api/responses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (sql) {
        const rows = await sql`DELETE FROM responses WHERE id = ${id} RETURNING id`;
        if (rows.length === 0) {
          return res.status(404).json({ error: "Resposta não encontrada." });
        }
        res.json({ success: true });
      } else {
        let responses = readResponsesJson();
        const before = responses.length;
        responses = responses.filter((r: any) => r.id !== id);
        if (responses.length === before) {
          return res.status(404).json({ error: "Resposta não encontrada." });
        }
        writeResponsesJson(responses);
        res.json({ success: true });
      }
    } catch (err) {
      console.error("Erro DELETE /api/responses/:id:", err);
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
