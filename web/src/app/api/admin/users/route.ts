import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE as string | undefined;

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({
        error: "Missing env vars",
        detail:
          "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE in web/.env.local",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (email) {
      const { data, error } = await admin.auth.admin.getUserByEmail(email);
      if (error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      return new Response(JSON.stringify({ user: data.user }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const page = Number(searchParams.get("page") || 1);
    const perPage = Number(searchParams.get("perPage") || 50);
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    return new Response(
      JSON.stringify({
        users: data.users,
        count: data.users.length,
        page,
        perPage,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
