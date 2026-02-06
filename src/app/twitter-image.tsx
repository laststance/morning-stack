// Twitter card image — delegates to the same OG image generator.
// `runtime` must be declared inline (cannot be re-exported per Next.js static analysis).
export { default, alt, size, contentType } from "./opengraph-image";

export const runtime = "edge";
