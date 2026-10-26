export function GET() {
  return Response.json(
    { service: "postcat", status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
