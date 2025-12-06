import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev_secret_change_me';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ user: null });

    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    return NextResponse.json({ user: { id: decoded.sub, email: decoded.email } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ user: null });
  }
}
