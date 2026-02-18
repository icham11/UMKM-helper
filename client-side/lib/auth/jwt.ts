import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. Please configure JWT_SECRET before starting the application.")
}

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}