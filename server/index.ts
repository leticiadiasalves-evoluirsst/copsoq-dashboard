import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

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
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

// ─── E-mail (recuperação de senha) ────────────────────────────────────────
// Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e APP_URL
// para habilitar o fluxo "Esqueci minha senha".
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const APP_URL = (process.env.APP_URL || "").replace(/\/+$/, "");
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

const mailer = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

if (mailer) {
  console.log(`Recuperação de senha por e-mail habilitada (SMTP ${SMTP_HOST}:${SMTP_PORT}).`);
} else {
  console.log("SMTP_HOST não definida. Recuperação de senha por e-mail desabilitada.");
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Limite simples de tentativas por IP para /api/auth/forgot-password
const forgotAttempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = forgotAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    forgotAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

async function sendResetEmail(to: string, username: string, token: string, baseUrl: string) {
  if (!mailer) throw new Error("SMTP não configurado.");
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject: "Redefinição de senha — Painel de Avaliação Psicossocial",
    text:
      `Olá, ${username}.\n\n` +
      `Recebemos um pedido para redefinir a senha da sua conta no Painel de Avaliação Psicossocial.\n\n` +
      `Para criar uma nova senha, acesse o link abaixo (válido por 1 hora):\n${link}\n\n` +
      `Se você não fez este pedido, ignore este e-mail. Sua senha continuará a mesma.`,
    html:
      `<p>Olá, <strong>${username}</strong>.</p>` +
      `<p>Recebemos um pedido para redefinir a senha da sua conta no <strong>Painel de Avaliação Psicossocial</strong>.</p>` +
      `<p>Para criar uma nova senha, clique no botão abaixo (válido por 1 hora):</p>` +
      `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px">Redefinir senha</a></p>` +
      `<p style="font-size:12px;color:#64748b">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>` +
      `<p style="font-size:12px;color:#64748b">Se você não fez este pedido, ignore este e-mail. Sua senha continuará a mesma.</p>`,
  });
}
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
        users.push({ id: newId, username: ADMIN_USER, password_hash: hash, salt, is_admin: true, email: ADMIN_EMAIL || null });
        writeUsersJson(users);
      } else if (existing.is_admin) {
        // Update admin password on startup
        existing.password_hash = hash;
        existing.salt = salt;
        if (ADMIN_EMAIL) existing.email = ADMIN_EMAIL;
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
    // Colunas para recuperação de senha (idempotente)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires BIGINT`;
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
      if (ADMIN_EMAIL) {
        await sql`UPDATE users SET email = ${ADMIN_EMAIL} WHERE username = ${ADMIN_USER} AND is_admin = true`;
      }
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

  // GET /api/auth/reset-available — Informa se a recuperação por e-mail está habilitada
  app.get("/api/auth/reset-available", (_req, res) => {
    res.json({ available: mailer !== null });
  });

  // POST /api/auth/forgot-password — Enviar e-mail de redefinição de senha
  app.post("/api/auth/forgot-password", async (req, res) => {
    if (!mailer) {
      return res.status(503).json({
        error: "A recuperação de senha por e-mail não está configurada. Contate o administrador do painel.",
      });
    }
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.ip || "unknown";
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const { identifier } = req.body || {};
    if (typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ error: "Informe seu usuário ou e-mail." });
    }
    const genericMessage =
      "Se existir uma conta com este usuário ou e-mail cadastrado, enviaremos um link de redefinição de senha.";
    const ident = identifier.trim();
    const identEmail = ident.toLowerCase();
    try {
      let user: any = null;
      if (sql) {
        const rows = await sql`
          SELECT id, username, email FROM users
          WHERE username = ${ident} OR LOWER(email) = ${identEmail}
          LIMIT 1
        `;
        user = rows[0] || null;
      } else {
        const users = readUsersJson();
        user =
          users.find((u: any) => u.username === ident || (u.email && u.email.toLowerCase() === identEmail)) || null;
      }
      // Resposta genérica para não revelar quais contas existem
      if (!user || !user.email) {
        return res.json({ success: true, message: genericMessage });
      }
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(token);
      const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
      if (sql) {
        await sql`UPDATE users SET reset_token_hash = ${tokenHash}, reset_token_expires = ${expiresAt} WHERE id = ${user.id}`;
      } else {
        const users = readUsersJson();
        const idx = users.findIndex((u: any) => u.id === user.id);
        if (idx !== -1) {
          users[idx].reset_token_hash = tokenHash;
          users[idx].reset_token_expires = expiresAt;
          writeUsersJson(users);
        }
      }
      const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] || req.protocol;
      const baseUrl = APP_URL || `${proto}://${req.get("host")}`;
      await sendResetEmail(user.email, user.username, token, baseUrl);
      res.json({ success: true, message: genericMessage });
    } catch (err) {
      console.error("Erro POST /api/auth/forgot-password:", err);
      res.status(500).json({ error: "Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde." });
    }
  });

  // POST /api/auth/reset-password — Definir nova senha a partir do token
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || !token) {
      return res.status(400).json({ error: "Link de redefinição inválido." });
    }
    if (typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 4 caracteres." });
    }
    const tokenHash = hashResetToken(token);
    const invalid = { error: "Link de redefinição inválido ou expirado. Solicite um novo." };
    try {
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      if (sql) {
        const rows = await sql`SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ${tokenHash} LIMIT 1`;
        const user = rows[0];
        if (!user || !user.reset_token_expires || Date.now() > Number(user.reset_token_expires)) {
          return res.status(400).json(invalid);
        }
        await sql`
          UPDATE users SET password_hash = ${hash}, salt = ${salt}, reset_token_hash = NULL, reset_token_expires = NULL
          WHERE id = ${user.id}
        `;
      } else {
        const users = readUsersJson();
        const idx = users.findIndex((u: any) => u.reset_token_hash === tokenHash);
        const user = idx !== -1 ? users[idx] : null;
        if (!user || !user.reset_token_expires || Date.now() > Number(user.reset_token_expires)) {
          return res.status(400).json(invalid);
        }
        users[idx].password_hash = hash;
        users[idx].salt = salt;
        delete users[idx].reset_token_hash;
        delete users[idx].reset_token_expires;
        writeUsersJson(users);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Erro POST /api/auth/reset-password:", err);
      res.status(500).json({ error: "Erro ao redefinir senha." });
    }
  });

  // GET /api/users — Listar usuários (admin only)
  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      if (sql) {
        const rows = await sql`SELECT id, username, email, is_admin, created_at FROM users ORDER BY id ASC`;
        res.json(rows);
      } else {
        const users = readUsersJson().map(({ id, username, email, is_admin, created_at }: any) => ({ id, username, email: email || null, is_admin, created_at }));
        res.json(users);
      }
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar usuários." });
    }
  });

  // POST /api/users — Criar usuário (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    const { username, password, email: rawEmail } = req.body || {};
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }
    const email = normalizeEmail(rawEmail);
    if (rawEmail && typeof rawEmail === "string" && rawEmail.trim() && !email) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    try {
      if (sql) {
        const rows = await sql`
          INSERT INTO users (username, password_hash, salt, is_admin, email)
          VALUES (${username.trim()}, ${hash}, ${salt}, false, ${email})
          RETURNING id, username, email, is_admin, created_at
        `;
        res.status(201).json(rows[0]);
      } else {
        const users = readUsersJson();
        if (users.find((u: any) => u.username === username.trim())) {
          return res.status(409).json({ error: "Usuário já existe." });
        }
        const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
        const newUser = { id: newId, username: username.trim(), password_hash: hash, salt, is_admin: false, email, created_at: new Date().toISOString() };
        users.push(newUser);
        writeUsersJson(users);
        res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email, is_admin: newUser.is_admin, created_at: newUser.created_at });
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

  // PATCH /api/users/:id/email — Definir e-mail de recuperação (admin only)
  app.patch("/api/users/:id/email", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { email: rawEmail } = req.body || {};
    const email = normalizeEmail(rawEmail);
    const clearing = rawEmail == null || (typeof rawEmail === "string" && !rawEmail.trim());
    if (!clearing && !email) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const value = clearing ? null : email;
    try {
      if (sql) {
        const rows = await sql`SELECT id FROM users WHERE id = ${id}`;
        if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
        await sql`UPDATE users SET email = ${value} WHERE id = ${id}`;
      } else {
        const users = readUsersJson();
        const idx = users.findIndex((u: any) => u.id === id);
        if (idx === -1) return res.status(404).json({ error: "Usuário não encontrado." });
        users[idx].email = value;
        writeUsersJson(users);
      }
      res.json({ success: true, email: value });
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar e-mail." });
    }
  });

  // PATCH /api/users/:id/password — Alterar senha (admin only)
  app.patch("/api/users/:id/password", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body || {};
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 4 caracteres." });
    }
    try {
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      if (sql) {
        const rows = await sql`SELECT id FROM users WHERE id = ${id}`;
        if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
        await sql`UPDATE users SET password_hash = ${hash}, salt = ${salt} WHERE id = ${id}`;
      } else {
        const users = readUsersJson();
        const idx = users.findIndex((u: any) => u.id === id);
        if (idx === -1) return res.status(404).json({ error: "Usuário não encontrado." });
        users[idx].password_hash = hash;
        users[idx].salt = salt;
        writeUsersJson(users);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao alterar senha." });
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
