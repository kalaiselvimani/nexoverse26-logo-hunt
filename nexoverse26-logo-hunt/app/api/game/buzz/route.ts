import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const s = await requireParticipant();

    if (!s) {
      return NextResponse.json(
        {
          success: false,
          error: "Participant session required",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "record_buzz",
      {
        p_event_id: s.eventId,
        p_participant_id: s.participantId,
      }
    );

    if (error) {
      console.error("RECORD BUZZ RPC ERROR", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log("BUZZ RESULT:", data);

    // Buzz was rejected
    if (!data?.accepted) {
      return NextResponse.json(
        {
          success: false,
          accepted: false,
          reason: data?.reason || "Buzz was not accepted",
        },
        { status: 409 }
      );
    }

    // Buzz accepted
    return NextResponse.json({
      success: true,
      accepted: true,
      buzzId: data?.buzz_id,
      priority: data?.priority,
      winner: data?.winner === true,
    });

  } catch (e) {
    console.error("BUZZ ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Buzz could not be recorded.",
      },
      { status: 500 }
    );
  }
}