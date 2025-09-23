import { NextRequest } from "next/server";

const FLASK_URL = process.env.FLASK_URL || "http://127.0.0.1:5500";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ flask: string[] }> }
) {
  const { flask } = await params;
  const path = flask?.join("/") || "";
  const url = `${FLASK_URL}/${path}`;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.headers.get("host") || "");
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    // Note: NextRequest's body can only be read once; clone via arrayBuffer
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    // Keep credentials off; backend should handle auth if needed
    redirect: "manual",
  };

  try {
    const response = await fetch(url, init);

    const resHeaders = new Headers(response.headers);
    // Ensure CORS-friendly for the browser when called via Next API
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Headers", "*");
    resHeaders.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Upstream fetch failed";
    return new Response(
      JSON.stringify({ error: "Bad Gateway", detail: message, upstream: url }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        },
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ flask: string[] }> }
) {
  return proxy(request, ctx);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ flask: string[] }> }
) {
  return proxy(request, ctx);
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ flask: string[] }> }
) {
  return proxy(request, ctx);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ flask: string[] }> }
) {
  return proxy(request, ctx);
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ flask: string[] }> }
) {
  return proxy(request, ctx);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    },
  });
}
