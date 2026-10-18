const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: { statusCode?: number; error?: string; message: string }
  ) {
    super(data.message || `API Error: ${status}`);
    this.name = "ApiError";
  }
}

let cachedAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("cc_token", token);
    } else {
      localStorage.removeItem("cc_token");
    }
  }
}

export function getAccessToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== "undefined") {
    cachedAccessToken = localStorage.getItem("cc_token");
  }
  return cachedAccessToken;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // send cookies for refresh token
  });

  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch {
      // Ignore parse failure
    }
    throw new ApiError(response.status, errorData);
  }

  return response.json() as Promise<T>;
}
