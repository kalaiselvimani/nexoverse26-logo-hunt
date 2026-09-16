import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const name = String(body.name || "").trim();
    const department = String(body.department || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Participant name is required." },
        { status: 400 }
      );
    }

    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, code")
      .eq(
        "code",
        process.env.DEFAULT_GAME_CODE || "NEXO26"
      )
      .maybeSingle();

    if (eventError) throw eventError;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Game event not found.",
        },
        { status: 404 }
      );
    }

    const { data: participant, error } = await supabaseAdmin
      .from("participants")
      .insert({
        event_id: event.id,
        name,
        department,
        status: "waiting",
        score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (e) {
    console.error("ADD PARTICIPANT ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Failed to add participant.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Participant ID is required.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("participants")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (e) {
    console.error("DELETE PARTICIPANT ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Failed to delete participant.",
      },
      { status: 500 }
    );
  }
}