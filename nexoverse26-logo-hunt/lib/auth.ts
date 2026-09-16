import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "change-this-secret-in-production"
);

export async function createSession(payload: {
  role: "organiser" | "participant";
  participantId?: string;
  eventId?: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function readOrganiserSession() {
  const store = await cookies();
  const token = store.get("nx_organiser_session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as {
      role?: string;
      participantId?: string;
      eventId?: string;
    };
  } catch {
    return null;
  }
}

export async function readParticipantSession() {
  const store = await cookies();
  const token = store.get("nx_participant_session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as {
      role?: string;
      participantId?: string;
      eventId?: string;
    };
  } catch {
    return null;
  }
}

export async function requireOrganiser() {
  const session = await readOrganiserSession();

  if (session?.role !== "organiser") {
    return null;
  }

  return session;
}

export async function requireParticipant() {
  const session = await readParticipantSession();

  if (
    session?.role !== "participant" ||
    !session.participantId ||
    !session.eventId
  ) {
    return null;
  }

  return session as {
    role: "participant";
    participantId: string;
    eventId: string;
  };
}