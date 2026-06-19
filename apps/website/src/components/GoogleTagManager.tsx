// Google Tag Manager loader (GA4 flows through the GTM container).
// Inlined official snippet — @next/third-parties is Next-only, so we ship
// it ourselves. Rendered from __root.tsx, production-only, gated on a GTM id.

type Props = { gtmId: string };

export function GoogleTagManagerScript({ gtmId }: Props) {
  const code = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function GoogleTagManagerNoScript({ gtmId }: Props) {
  return (
    <noscript>
      <iframe
        title="gtm"
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
