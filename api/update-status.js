const APPS_SCRIPT_URL = process.env.VITE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxnfzmX51wo0vYICqaVVmDGDMZFbDkrKbanIAZeXajlZAbs5MmXMsibl5b7Ecdx0RJxbg/exec";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("action", "updateStatus");
    url.searchParams.set("token", payload.token || "");
    url.searchParams.set("rowNumber", Number(payload.rowNumber));
    url.searchParams.set("status", payload.status || "");
    url.searchParams.set("_", Date.now());

    const response = await fetch(url.toString());
    const result = await response.json();
    res.setHeader("Cache-Control", "no-store");
    res.status(result.ok === false ? 400 : 200).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "Status update failed." });
  }
}
