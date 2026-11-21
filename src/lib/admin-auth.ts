import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "gg_admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAdminSession(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export async function verifyAdmin(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  const token = cookie?.slice(COOKIE_NAME.length + 1);
  if (!token) throw new Error("Authentication required");

  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) {
    throw new Error("Invalid admin session");
  }

  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new Error("Invalid admin session");
  }

  let data: { email?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid admin session");
  }

  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (
    !allowedEmail ||
    data.email !== allowedEmail ||
    !data.exp ||
    data.exp < Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Admin session expired or not authorized");
  }

  return { email: data.email };
}

export { COOKIE_NAME };
