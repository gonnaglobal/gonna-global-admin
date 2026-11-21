import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";


function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("Authentication") || message.includes("session") || message.includes("authorized") ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    const snapshot = await adminDb.collection("opportunities").get();
    const opportunities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
    }));
    opportunities.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return NextResponse.json({ opportunities });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    for (const field of ["title", "organization", "description", "type", "mode"]) {
      if (!String(body[field] ?? "").trim()) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const data = {
      title: String(body.title).trim(),
      organization: String(body.organization).trim(),
      description: String(body.description).trim(),
      posterUrl: String(body.posterUrl ?? ""),
      location: String(body.location ?? ""),
      eligibility: String(body.eligibility ?? ""),
      responsibilities: String(body.responsibilities ?? ""),
      type: String(body.type),
      deadline: String(body.deadline ?? ""),
      mode: String(body.mode),
      funding: String(body.funding ?? ""),
      careerDomain: String(body.careerDomain ?? ""),
      deadlineType: String(body.deadlineType ?? "Open"),
      benefits: String(body.benefits ?? ""),
      applicationLink: String(body.applicationLink ?? ""),
      status: body.status === "draft" ? "draft" : "active",
      archivedAt: null,
      createdBy: "local-admin",
      postedByType: "admin",
      postedByLabel: "Admin",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection("opportunities").add(data);
    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });

    const allowed = [
      "title", "organization", "description", "posterUrl", "location",
      "eligibility", "responsibilities", "type", "deadline", "mode",
      "funding", "careerDomain", "deadlineType", "benefits",
      "applicationLink", "status",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updatedAt = FieldValue.serverTimestamp();
    updates.postedByType = "admin";
    updates.postedByLabel = "Admin";

    await adminDb.collection("opportunities").doc(String(body.id)).update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });
    await adminDb.collection("opportunities").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}
