import crypto from "node:crypto";

const HASH_ALGORITHM = "pbkdf2_sha256";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 64;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_SESSION_SECRET = "campusbridge-local-dev-secret-change-before-production";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, "sha256")
    .toString("base64url");
  return `${HASH_ALGORITHM}$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, iterationsValue, salt, hash] = String(storedHash || "").split("$");
  const iterations = Number(iterationsValue);

  if (algorithm !== HASH_ALGORITHM || !iterations || !salt || !hash) {
    return false;
  }

  const storedBuffer = Buffer.from(hash, "base64url");
  const candidateBuffer = crypto.pbkdf2Sync(password, salt, iterations, storedBuffer.length, "sha256");

  return storedBuffer.length === candidateBuffer.length && crypto.timingSafeEqual(storedBuffer, candidateBuffer);
}

export function createAdminToken(admin) {
  const payload = {
    sub: admin._id.toString(),
    fullName: admin.fullName,
    email: admin.email,
    department: admin.department,
    role: admin.role,
    exp: Date.now() + TOKEN_TTL_MS
  };
  return signToken(payload);
}

export function verifyAdminToken(token) {
  try {
    const [headerPart, payloadPart, signature] = String(token || "").split(".");
    if (!headerPart || !payloadPart || !signature) return null;

    const expectedSignature = createSignature(`${headerPart}.${payloadPart}`);
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch (error) {
    return null;
  }
}

function signToken(payload) {
  const headerPart = encodeJson({ alg: "HS256", typ: "CampusBridgeAdmin" });
  const payloadPart = encodeJson(payload);
  const signature = createSignature(`${headerPart}.${payloadPart}`);
  return `${headerPart}.${payloadPart}.${signature}`;
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createSignature(value) {
  return crypto.createHmac("sha256", process.env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET).update(value).digest("base64url");
}
