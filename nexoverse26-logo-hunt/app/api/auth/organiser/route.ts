import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (
      email !== process.env.ORGANISER_EMAIL ||
      password !== process.env.ORGANISER_PASSWORD
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect email or password",
        },
        { status: 401 }
      );
    }

    const token = await createSession({
      role: "organiser",
    });

    const res = NextResponse.json({
      success: true,
    });

    res.cookies.set("nx_organiser_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid login request",
      },
      { status: 400 }
    );
  }
}