import { sql } from "@/lib/db";

// Photos and PDFs uploaded in /admin. Ids are random UUIDs; files are public
// website material. Images show inline; PDFs open in the browser's viewer.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!sql || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const [file] = await sql<{ name: string; content_type: string; data: Buffer }[]>`
    SELECT name, content_type, data FROM web.cms_file(${id}::uuid)`.catch(() => []);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": `inline; filename="${file.name.replace(/[^\w.\- ]/g, "_")}"`,
      // a file never changes once uploaded; a new upload gets a new id
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
