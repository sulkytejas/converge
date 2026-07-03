// The login page is a static client component, so Next prerenders it and emits
// `Cache-Control: s-maxage=31536000`. Behind Cloudflare that let a router RSC
// prefetch (content-type: text/x-component) get cached under the bare
// `/admin/login` URL and then served to real document navigations — the page
// renders as raw RSC text instead of HTML. Forcing this segment dynamic makes
// Next send `no-store`, so the edge never caches the route (same as the partner
// login, which already bypasses the CDN). Auth entry points shouldn't be
// edge-cached anyway.
export const dynamic = "force-dynamic";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
