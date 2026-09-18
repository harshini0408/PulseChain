// fetch wrapper using VITE_API_URL. Throws ApiError on non-2xx responses.

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // ignore parse errors — use default message
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}
