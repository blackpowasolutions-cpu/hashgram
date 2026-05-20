import { getAuthToken } from "./auth";

const originalFetch = window.fetch;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = getAuthToken();
  
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const newInit = { ...init, headers };
  
  // Handle 401s globally if needed, but for now just attach token
  const response = await originalFetch(input, newInit);
  
  if (response.status === 401) {
    // Optionally trigger logout or redirect, but AuthContext also handles /auth/me failures
  }
  
  return response;
};
