import { notFound } from "next/navigation";

// Sends unknown addresses under /si, /ta and /en to the translated 404 page.
export default function CatchAll() {
  notFound();
}
