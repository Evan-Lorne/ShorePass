import { cookies } from "next/headers";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";
import { HttpError } from "./http";

export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = process.env.APP_ORIGIN;
  if (allowed ? origin !== allowed : new URL(origin).host !== request.headers.get("host"))
    throw new HttpError(403, "请求来源无效。");
}

export async function device(request?: Request) {
  const token =
    request?.headers.get("authorization")?.replace(/^Bearer /, "") ||
    (await cookies()).get("shorepass_device")?.value;
  const found = token ? await prisma.deviceToken.findUnique({ where: { token } }) : null;
  if (!found || found.isRevoked) throw new HttpError(401, "设备尚未连接，请刷新页面。");
  if (request && !["GET", "HEAD"].includes(request.method)) {
    assertOrigin(request);
  }
  return found;
}
export async function setDeviceCookie(token: string) {
  (await cookies()).set("shorepass_device", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
export async function createDevice(userId = randomUUID()) {
  return prisma.deviceToken.create({ data: { userId, token: randomBytes(32).toString("hex") } });
}
export function requireAdmin(request: Request) {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (
    !expected ||
    !supplied ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    throw new HttpError(403, "需要管理员凭证。");
}
