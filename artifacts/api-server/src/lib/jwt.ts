import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-prod";
const JWT_EXPIRES_IN = "30d";

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getLevel(points: number): number {
  if (points >= 12000) return 5;
  if (points >= 8000) return 4;
  if (points >= 5000) return 3;
  if (points >= 1000) return 2;
  return 1;
}
