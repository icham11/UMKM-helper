import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface AuthenticatedContext {
  userId: number;
  businessId: number;
}

/** Custom error thrown by requireAuth when user is not authenticated. */
export class AuthError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

/** Type guard to check if an error is an AuthError. */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Get the authenticated user's ID and their (first) business ID.
 * Returns null if not authenticated or no business exists.
 */
export async function getAuthContext(): Promise<AuthenticatedContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const business = await prisma.business.findFirst({
    where: { userId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!business) return null;

  return { userId, businessId: business.id };
}

/**
 * Require auth context or throw a structured error object
 * that route handlers can use directly.
 */
export async function requireAuth(): Promise<AuthenticatedContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new AuthError();
  }
  return ctx;
}
