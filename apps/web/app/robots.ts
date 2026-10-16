import type { MetadataRoute } from "next";

// A healthcare prototype with fictional demo data: keep it out of search results.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
