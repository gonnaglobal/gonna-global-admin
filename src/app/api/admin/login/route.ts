import { NextResponse } from "next/server";
import {
  createAdminSession,
  getAdminCookieOptions,
  verifyAdmin,
  COOKIE_NAME,
} from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    return NextResponse.json({ authenticated: true, email: admin.email });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!allowedEmail || !expectedPassword) {
      return NextResponse.json(
        { error: "Admin login is not configured on the server." },
        { status: 503 }
      );
    }

    if (email !== allowedEmail || password !== expectedPassword) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = createAdminSession(email);
    const response = NextResponse.json({ success: true, email });
    response.cookies.set(COOKIE_NAME, token, getAdminCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 }
    );
  }
}
