import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";


export async function GET(request: Request) {
  try {
    await verifyAdmin(request);

    const snapshot = await adminDb
      .collection("opportunities")
      .limit(1000)
      .get();

    return NextResponse.json({
      success: true,
      database: "connected",
      collection: "opportunities",
      totalLoaded: snapshot.size,
      message: "Connected to the existing Gonn'a Global Firestore database.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 401 }
    );
  }
}
