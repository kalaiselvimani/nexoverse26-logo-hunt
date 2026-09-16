import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    // Get latest event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) throw eventError;

    if (!event) {
      return NextResponse.json({
        success: true,
        rounds: []
      });
    }

    const { data: rounds, error } = await supabaseAdmin
      .from("rounds")
      .select("id,name,sort_order")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rounds: rounds || []
    });

  } catch (e) {
    console.error("ROUNDS GET ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error
          ? e.message
          : "Rounds could not be loaded"
      },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Round name is required."
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // Get latest event from database
    // --------------------------------
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) throw eventError;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Game event not found."
        },
        { status: 404 }
      );
    }

    // --------------------------------
    // Automatically calculate next
    // round number
    // --------------------------------
    const { data: lastRound, error: lastRoundError } =
      await supabaseAdmin
        .from("rounds")
        .select("sort_order")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastRoundError) throw lastRoundError;

    const nextSortOrder =
      (lastRound?.sort_order || 0) + 1;

    // --------------------------------
    // Create round
    // --------------------------------
    const { data, error } = await supabaseAdmin
      .from("rounds")
      .insert({
        event_id: event.id,
        name,
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      round: data
    });

  } catch (e) {
    console.error("ROUND CREATE ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Round could not be created"
      },
      { status: 500 }
    );
  }
}