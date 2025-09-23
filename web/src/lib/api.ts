export const api = {
  get: async (path: string) => {
    const res = await fetch(`/api/${path}`, { method: "GET" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  postJson: async (path: string, body: unknown) => {
    const res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  postForm: async (path: string, formData: FormData) => {
    const res = await fetch(`/api/${path}`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
