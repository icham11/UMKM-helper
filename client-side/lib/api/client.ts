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
    return
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || "API Error")
  }

  return res.json()
}