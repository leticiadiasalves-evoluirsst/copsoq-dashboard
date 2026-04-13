import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, "[]", "utf-8");
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
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

function readUsersJson(): any[] {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsersJson(data: any[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Auth ─────────────────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "changeme-secret";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function signToken(payload: string): string {
  return crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
}

function createToken(username: string, isAdmin: boolean): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}:${isAdmin ? "1" : "0"}:${expiresAt}`;
  return `${Buffer.from(payload).toString("base64url")}:${signToken(payload)}`;
}

function verifyToken(token: string): { valid: boolean; isAdmin: boolean; username: string } {
  try {
    const colonIdx = token.indexOf(":");
    if (colonIdx === -1) return { valid: false, isAdmin: false, username: "" };
    const encodedPayload = token.slice(0, colonIdx);
    const sig = token.slice(colonIdx + 1);
    const payload = Buffer.from(encodedPayload, "base64url").toString();
    const expected = signToken(payload);
    if (sig.length !== expected.length) return { valid: false, isAdmin: false, username: "" };
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { valid: false, isAdmin: false, username: "" };
    }
    const parts = payload.split(":");
    // parts: [username, isAdmin, expiresAt]
    if (parts.length < 3) return { valid: false, isAdmin: false, username: "" };
    const expiresAt = parseInt(parts[parts.length - 1], 10);
    if (Date.now() >= expiresAt) return { valid: false, isAdmin: false, username: "" };
    const isAdmin = parts[parts.length - 2] === "1";
    const username = parts.slice(0, parts.length - 2).join(":");
    return { valid: true, isAdmin, username };
  } catch {
    return { valid: false, isAdmin: false, username: "" };
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Não autorizado." });
  const result = verifyToken(h.slice(7));
  if (!result.valid) return res.status(401).json({ error: "Token inválido ou expirado." });
  (req as any).authUser = result;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Não autorizado." });
  const result = verifyToken(h.slice(7));
  if (!result.valid) return res.status(401).json({ error: "Token inválido ou expirado." });
  if (!result.isAdmin) return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
  (req as any).authUser = result;
  next();
}

// ─── Inicialização do Banco de Dados ───────────────────────────────────────
async function initDb() {
  if (!sql) {
    // JSON fallback: seed admin user
    if (ADMIN_PASSWORD) {
      const users = readUsersJson();
      const existing = users.find((u: any) => u.username === ADMIN_USER);
      const salt = generateSalt();
      const hash = hashPassword(ADMIN_PASSWORD, salt);
      if (!existing) {
        const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
        users.push({ id: newId, username: ADMIN_USER, password_hash: hash, salt, is_admin: true });
        writeUsersJson(users);
      } else if (existing.is_admin) {
        // Update admin password on startup
        existing.password_hash = hash;
        existing.salt = salt;
        writeUsersJson(users);
      }
    }
    return;
  }

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
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    // Seed admin user from env vars
    if (ADMIN_PASSWORD) {
      const salt = generateSalt();
      const hash = hashPassword(ADMIN_PASSWORD, salt);
      await sql`
        INSERT INTO users (username, password_hash, salt, is_admin)
        VALUES (${ADMIN_USER}, ${hash}, ${salt}, true)
        ON CONFLICT (username) DO UPDATE SET password_hash = ${hash}, salt = ${salt}, is_admin = true
        WHERE users.is_admin = true
      `;
    }
    console.log("Tabelas verificadas/criadas com sucesso no PostgreSQL.");
  } catch (err) {
    console.error("Erro ao inicializar tabelas no PostgreSQL:", err);
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

  // POST /api/auth/login — Autenticar usuário
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }
    try {
      let user: any = null;
      if (sql) {
        const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
        user = rows[0] || null;
      } else {
        const users = readUsersJson();
        user = users.find((u: any) => u.username === username) || null;
      }
      if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos." });
      const hash = hashPassword(password, user.salt);
      const hashBuf = Buffer.from(hash);
      const storedBuf = Buffer.from(user.password_hash);
      if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
        return res.status(401).json({ error: "Usuário ou senha incorretos." });
      }
      res.json({ token: createToken(user.username, user.is_admin) });
    } catch (err) {
      console.error("Erro POST /api/auth/login:", err);
      res.status(500).json({ error: "Erro ao fazer login." });
    }
  });

  // GET /api/users — Listar usuários (admin only)
  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      if (sql) {
        const rows = await sql`SELECT id, username, is_admin, created_at FROM users ORDER BY id ASC`;
        res.json(rows);
      } else {
        const users = readUsersJson().map(({ id, username, is_admin, created_at }: any) => ({ id, username, is_admin, created_at }));
        res.json(users);
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar usuários." });
    }
  });

  // POST /api/users — Criar usuário (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    try {
      if (sql) {
        const rows = await sql`
          INSERT INTO users (username, password_hash, salt, is_admin)
          VALUES (${username.trim()}, ${hash}, ${salt}, false)
          RETURNING id, username, is_admin, created_at
        `;
        res.status(201).json(rows[0]);
      } else {
        const users = readUsersJson();
        if (users.find((u: any) => u.username === username.trim())) {
          return res.status(409).json({ error: "Usuário já existe." });
        }
        const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
        const newUser = { id: newId, username: username.trim(), password_hash: hash, salt, is_admin: false, created_at: new Date().toISOString() };
        users.push(newUser);
        writeUsersJson(users);
        res.status(201).json({ id: newUser.id, username: newUser.username, is_admin: newUser.is_admin, created_at: newUser.created_at });
      }
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Usuário já existe." });
      res.status(500).json({ error: "Erro ao criar usuário." });
    }
  });

  // DELETE /api/users/:id — Excluir usuário (admin only, não pode excluir admin)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      if (sql) {
        const rows = await sql`SELECT id, username, is_admin FROM users WHERE id = ${id}`;
        const target = rows[0];
        if (!target) return res.status(404).json({ error: "Usuário não encontrado." });
        if (target.is_admin) return res.status(403).json({ error: "Não é possível excluir o administrador." });
        await sql`DELETE FROM users WHERE id = ${id}`;
      } else {
        const users = readUsersJson();
        const target = users.find((u: any) => u.id === id);
        if (!target) return res.status(404).json({ error: "Usuário não encontrado." });
        if (target.is_admin) return res.status(403).json({ error: "Não é possível excluir o administrador." });
        writeUsersJson(users.filter((u: any) => u.id !== id));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir usuário." });
    }
  });

  // GET /api/responses — Retrieve all saved responses
  app.get("/api/responses", async (_req, res) => {
    try {
      if (sql) {
        const rows = await sql`SELECT * FROM responses ORDER BY id ASC`;
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
        res.status(201).json({
          id: row.id,
          empresa: row.empresa,
          setor: row.setor,
          funcao: row.funcao,
          nome: row.nome,
          respostas: row.respostas,
          submittedAt: row.submitted_at
        });
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

  // PATCH /api/responses/rename — Rename empresa/setor/funcao (auth required)
  app.patch("/api/responses/rename", requireAuth, async (req, res) => {
    try {
      const { field, oldValue, newValue } = req.body || {};
      if (!["empresa", "setor", "funcao"].includes(field) || !oldValue || !newValue) {
        return res.status(400).json({ error: "Dados inválidos." });
      }
      if (sql) {
        if (field === "empresa") {
          await sql`UPDATE responses SET empresa = ${newValue} WHERE empresa = ${oldValue}`;
        } else if (field === "setor") {
          await sql`UPDATE responses SET setor = ${newValue} WHERE setor = ${oldValue}`;
        } else {
          await sql`UPDATE responses SET funcao = ${newValue} WHERE funcao = ${oldValue}`;
        }
      } else {
        const responses = readResponsesJson();
        responses.forEach((r: any) => { if (r[field] === oldValue) r[field] = newValue; });
        writeResponsesJson(responses);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Erro PATCH /api/responses/rename:", err);
      res.status(500).json({ error: "Erro ao renomear." });
    }
  });

  // DELETE /api/responses/:id — Delete a specific response (admin only)
  app.delete("/api/responses/:id", requireAdmin, async (req, res) => {
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

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
