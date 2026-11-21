"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Opportunity = {
  id: string;
  title?: string;
  organization?: string;
  description?: string;
  posterUrl?: string;
  location?: string;
  eligibility?: string;
  responsibilities?: string;
  type?: string;
  mode?: string;
  deadline?: string;
  funding?: string;
  careerDomain?: string;
  deadlineType?: string;
  benefits?: string;
  applicationLink?: string;
  locationRegion?: string;
  experienceLevel?: string;
  status?: string;
  createdAt?: string | null;
};

const blank = {
  title: "",
  organization: "",
  description: "",
  eligibility: "",
  responsibilities: "",
  location: "",
  type: "",
  mode: "Online",
  deadline: "",
  funding: "Free to Participate",
  careerDomain: "",
  deadlineType: "Fixed Deadline",
  benefits: "",
  applicationLink: "",
  locationRegion: "Anywhere",
  experienceLevel: "All Levels",
  status: "active",
};

const input =
  "mt-1 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2.5 text-sm text-[#344054] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const cloudinaryUrl =
  "https://api.cloudinary.com/v1_1/dch6dxstp/image/upload";

function expired(deadline?: string) {
  if (!deadline) return false;
  const date = new Date(`${deadline.slice(0, 10)}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [items, setItems] = useState<Opportunity[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [poster, setPoster] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [eligibility, setEligibility] = useState<string[]>(["Open to All"]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/login", { credentials: "same-origin" })
      .then((response) => {
        if (active && response.ok) setUnlocked(true);
      })
      .catch(() => {
        if (active) setUnlocked(false);
      });
    return () => { active = false; };
  }, []);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const raw = await response.text();
    let result: any = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { result = {}; }
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    return result;
  }

  async function loadItems() {
    setLoading(true);
    try {
      const result = await api("/api/opportunities");
      setItems(result.opportunities || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked) void loadItems();
  }, [unlocked]);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setPasscodeError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passcode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Login failed.");
      setUnlocked(true);
      setPasscode("");
    } catch (error) {
      setPasscodeError(error instanceof Error ? error.message : "Login failed.");
    }
  }

  function setField(key: keyof typeof blank, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function resetForm() {
    setForm(blank);
    setPoster(null);
    setPosterUrl("");
    setEligibility(["Open to All"]);
    setEditingId(null);
  }

  function startEdit(item: Opportunity) {
    setEditingId(item.id);
    setForm({
      ...blank,
      title: item.title || "",
      organization: item.organization || "",
      description: item.description || "",
      eligibility: item.eligibility || "",
      responsibilities: item.responsibilities || "",
      location: item.location || "",
      type: item.type || "",
      mode: item.mode || "Online",
      deadline: item.deadline || "",
      funding: item.funding || "Free to Participate",
      careerDomain: item.careerDomain || "",
      deadlineType: item.deadlineType || "Fixed Deadline",
      benefits: item.benefits || "",
      applicationLink: item.applicationLink || "",
      locationRegion: item.locationRegion || "Anywhere",
      experienceLevel: item.experienceLevel || "All Levels",
      status: item.status || "active",
    });
    setEligibility(
      (item.eligibility || "Open to All").split(", ").filter(Boolean)
    );
    setPoster(null);
    setPosterUrl(item.posterUrl || "");
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveOpportunity(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() ||
        !form.type.trim() || !form.deadline.trim()) {
      setError("Please complete the title, description, type, and deadline.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      let finalPosterUrl = posterUrl;

      if (poster) {
        const data = new FormData();
        data.append("file", poster);
        data.append("upload_preset", "goglobal-opportunities");
        const response = await fetch(cloudinaryUrl, {
          method: "POST",
          body: data,
        });
        if (!response.ok) throw new Error("Poster upload failed. Try another image.");
        const uploaded = await response.json();
        if (!uploaded.secure_url) throw new Error("Cloudinary did not return a poster URL.");
        finalPosterUrl = uploaded.secure_url;
      }

      const payload = {
        ...form,
        title: form.title.trim(),
        organization: form.organization.trim(),
        posterUrl: finalPosterUrl,
        eligibility: eligibility.includes("Open to All")
          ? "Open to All"
          : eligibility.join(", "),
        status: expired(form.deadline) ? "archived" : form.status,
        postedByType: "admin",
        postedByLabel: "Admin",
      };

      if (editingId) {
        await api("/api/opportunities", {
          method: "PATCH",
          body: JSON.stringify({ ...payload, id: editingId }),
        });
        setMessage("Opportunity updated successfully.");
      } else {
        await api("/api/opportunities", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Opportunity published successfully.");
      }

      resetForm();
      setShowForm(false);
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save opportunity.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOpportunity(id: string) {
    if (!window.confirm("Delete this opportunity permanently?")) return;
    try {
      await api(`/api/opportunities?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setMessage("Opportunity deleted.");
      await loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete opportunity.");
    }
  }

  const activeItems = items.filter((x) => !expired(x.deadline));
  const archivedItems = items.filter((x) => expired(x.deadline));
  const displayed = (view === "active" ? activeItems : archivedItems).filter((x) =>
    `${x.title || ""} ${x.organization || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080d18] px-5 text-white">
        <form onSubmit={unlock} className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#101827] p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">Gonn'a Global</p>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mb-6 mt-2 text-sm text-slate-400">Enter your dashboard password.</p>
          <input className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" autoComplete="username" required autoFocus />
          <input className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Password" autoComplete="current-password" required />
          {passcodeError && <p className="mt-3 text-sm text-red-400">{passcodeError}</p>}
          <button className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950">Open Dashboard</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] text-[#1A1A2E]">
      <header className="border-b border-[#E7DDD1] bg-[#FFFDF9]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8B7355]">Gonn'a Global</p>
            <h1 className="mt-1 text-xl font-bold">Super Admin Dashboard</h1>
          </div>
          <span className="text-sm text-[#687995]">Opportunity Management</span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5EAF2] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold">Manage Opportunities</h2>
            <p className="mt-1 text-sm text-[#687995]">Publish and manage opportunities on Gonn'a Global.</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white">
            + Post an Opportunity
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total", items.length],
            ["Active", activeItems.length],
            ["Archived", archivedItems.length],
          ].map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-[#E5EAF2] bg-white p-5">
              <p className="text-sm text-[#687995]">{label}</p>
              <p className="mt-2 text-3xl font-bold">{count}</p>
            </div>
          ))}
        </div>

        {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {showForm && (
          <section className="rounded-2xl border border-[#E5EAF2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{editingId ? "Edit Opportunity" : "Post an Opportunity"}</h3>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-sm text-[#687995]">Cancel</button>
            </div>

            <form onSubmit={saveOpportunity} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {([
                ["title", "Opportunity title", true, false, "text"],
                ["organization", "Organization", false, false, "text"],
                ["type", "Opportunity type", true, false, "text"],
                ["description", "Description", true, true, "text"],
                ["eligibility", "Eligibility details", false, true, "text"],
                ["responsibilities", "Responsibilities", false, true, "text"],
                ["location", "Location", false, false, "text"],
                ["deadline", "Application deadline", true, false, "date"],
                ["careerDomain", "Career domain", false, false, "text"],
                ["benefits", "Benefits", false, true, "text"],
                ["applicationLink", "Application URL (add only if external form)", false, false, "url"],
              ] as const).map(([key, label, required, multiline, type]) => (
                <label key={key} className={`block text-sm font-medium text-[#344054] ${multiline ? "md:col-span-2" : ""}`}>
                  {label}{required ? " *" : ""}
                  {key === "type" ? (
                    <select
                      required={required}
                      value={form.type}
                      onChange={(e) => setField("type", e.target.value)}
                      className={input}
                    >
                      <option value="">Select opportunity category</option>
                      {[
                        "Global Opportunities",
                        "Internships",
                        "Hackathons",
                        "Sports",
                        "Conferences",
                        "Freelancing",
                        "Events",
                        "Competitions",
                      ].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : multiline ? (
                    <textarea required={required} rows={4} value={form[key]} onChange={(e) => setField(key, e.target.value)} className={input} />
                  ) : (
                    <input required={required} type={type} value={form[key]} onChange={(e) => setField(key, e.target.value)} className={input} />
                  )}
                </label>
              ))}

              <div className="rounded-xl border border-[#E5EAF2] p-4 md:col-span-2">
                <label className="block text-sm font-medium text-[#344054]">
                  Opportunity poster
                  <input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm" />
                </label>
                {poster && <p className="mt-2 text-xs text-[#687995]">Selected: {poster.name}</p>}
                {!poster && posterUrl && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-[#687995]">Current poster</p>
                    <img src={posterUrl} alt="Current opportunity poster" className="max-h-48 rounded-lg border object-contain" />
                    <button type="button" onClick={() => setPosterUrl("")} className="mt-2 text-xs font-semibold text-red-600">Remove current poster</button>
                  </div>
                )}
                <p className="mt-2 text-xs text-[#687995]">Poster uploads use the existing Gonn'a Global Cloudinary preset.</p>
              </div>

              <div className="space-y-5 rounded-xl border border-[#E5EAF2] p-4 md:col-span-2">
                <h4 className="font-semibold">Explore filters</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Mode *
                    <select required value={form.mode} onChange={(e) => setField("mode", e.target.value)} className={input}>
                      <option value="">Select mode</option>
                      {["Online", "On-site", "Hybrid"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Deadline type *
                    <select required value={form.deadlineType} onChange={(e) => setField("deadlineType", e.target.value)} className={input}>
                      <option value="">Select deadline type</option>
                      {["Fixed Deadline", "Rolling", "No Deadline"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Location region *
                    <select required value={form.locationRegion} onChange={(e) => setField("locationRegion", e.target.value)} className={input}>
                      {["Anywhere", "Asia", "Europe", "Africa", "South America", "North America", "Australia", "Others"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Funding / Stipend *
                    <select required value={form.funding} onChange={(e) => setField("funding", e.target.value)} className={input}>
                      {["Fully Funded", "Partially Funded", "Paid", "Unpaid", "Free to Participate", "Paid Registration"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Eligibility</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {["Students", "Professionals", "Graduates", "Open to All"].map((x) => (
                      <label key={x} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={eligibility.includes(x)} onChange={(e) => setEligibility((old) => {
                          if (x === "Open to All") return e.target.checked ? ["Open to All"] : [];
                          const next = e.target.checked ? [...old.filter((v) => v !== "Open to All"), x] : old.filter((v) => v !== x);
                          return next;
                        })} />
                        {x}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Experience level *</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {["Beginner", "Intermediate", "Advanced", "All Levels"].map((x) => (
                      <label key={x} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="experienceLevel" checked={form.experienceLevel === x} onChange={() => setField("experienceLevel", x)} />
                        {x}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button type="submit" disabled={loading} className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {loading ? "Saving..." : editingId ? "Save Changes" : "Publish Opportunity"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl border border-[#D1D5DB] px-5 py-3 text-sm font-semibold">Cancel</button>
              </div>
            </form>
            <p className="mt-3 text-xs text-[#687995]">Fields marked * are required. Expired deadlines appear under Archived.</p>
          </section>
        )}

        <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button onClick={() => setView("active")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "active" ? "bg-[#2563EB] text-white" : "bg-[#F2F5FA]"}`}>Active ({activeItems.length})</button>
              <button onClick={() => setView("archived")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "archived" ? "bg-[#2563EB] text-white" : "bg-[#F2F5FA]"}`}>Archived ({archivedItems.length})</button>
            </div>
            <button onClick={() => void loadItems()} className="text-sm font-semibold text-[#2563EB]">Refresh</button>
          </div>
          <input className={`${input} mb-4 max-w-md`} placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? <p className="py-10 text-center text-sm text-[#687995]">Loading opportunities...</p> :
            displayed.length === 0 ? <p className="py-10 text-center text-sm text-[#687995]">No opportunities in this view yet.</p> :
            <div className="space-y-4">
              {displayed.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#E5EAF2] p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold">{item.title || "Untitled opportunity"}</h3>
                      <p className="mt-1 text-sm text-[#687995]">{item.organization || "Organization"}{item.type ? ` · ${item.type}` : ""}</p>
                      <p className="mt-2 text-sm text-[#475467]">Deadline: {item.deadline || "Not specified"}</p>
                      {item.location && <p className="mt-1 text-sm text-[#687995]">Location: {item.location}</p>}
                      <span className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">Posted by Admin</span>
                    </div>
                    <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs">{expired(item.deadline) ? "Archived" : "Active"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => startEdit(item)} className="rounded-lg border px-3 py-2 text-sm">Edit</button>
                    <button onClick={() => void deleteOpportunity(item.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          }
        </section>
      </section>
    </main>
  );
}
