import { apiFetch } from "./client";

export type Business = {
  id: string;
  name: string;
};

export async function getCurrentBusiness(): Promise<Business | null> {
  try {
    return await apiFetch("/api/mock-business");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No business") {
      return null;
    }
    throw error;
  }
}

export async function createBusiness(data: { name: string; location: string }) {
  return apiFetch("/api/mock-business/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
