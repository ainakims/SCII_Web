import { JwtUserPayload } from "../interfaces/user_session";
import jwt from "jsonwebtoken"

export async function generateJwtUser(jwtDataUser: JwtUserPayload): Promise<string | null> {
  try {
    const payload: JwtUserPayload = jwtDataUser;
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {});
    return token
  }
  catch (error: any) {
    JSON.stringify(error.message);
    return null
  }
}