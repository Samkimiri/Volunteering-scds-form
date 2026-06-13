const APPS_SCRIPT_URL = process.env.VITE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxnfzmX51wo0vYICqaVVmDGDMZFbDkrKbanIAZeXajlZAbs5MmXMsibl5b7Ecdx0RJxbg/exec";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const token = String(req.query.token || "").trim();
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("action", "admin");
    url.searchParams.set("token", token);
    url.searchParams.set("_", Date.now());

    const response = await fetch(url.toString());
    const result = await response.json();

    res.setHeader("Cache-Control", "no-store");
    res.status(result.ok === false ? 400 : 200).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "Unable to load applications." });
  }
}
