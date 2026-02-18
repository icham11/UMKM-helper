export async function apiFetch(
  input: RequestInfo,
  init?: RequestInit
) {
  const res = await fetch(input, {
    credentials: "include", 
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || "API Error")
  }

  return res.json()
}