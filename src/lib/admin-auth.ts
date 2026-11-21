import { adminAuth } from "@/lib/firebase-admin";

export async function verifyAdmin(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Authentication required");
  }

  const decoded = await adminAuth.verifyIdToken(header.slice(7), true);
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!allowedEmail || decoded.email?.toLowerCase() !== allowedEmail) {
    throw new Error("Not authorized as Super Admin");
  }

  if (!decoded.email_verified) {
    throw new Error("Verify your email before accessing the portal");
  }

  return decoded;
}
