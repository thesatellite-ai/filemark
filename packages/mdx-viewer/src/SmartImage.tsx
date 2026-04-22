import { useEffect, useState } from "react";
import type { AssetResolver } from "@filemark/core";

export function SmartImage({
  src,
  alt,
  assets,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  assets?: AssetResolver;
}) {
  const [resolved, setResolved] = useState<string | undefined>(
    typeof src === "string" ? src : undefined
  );

  useEffect(() => {
    if (!src || typeof src !== "string") return;
    if (!assets) return;
    if (/^(https?:|data:|blob:|chrome-extension:)/.test(src)) {
      setResolved(src);
      return;
    }
    let cancelled = false;
    assets
      .resolve(src)
      .then((r) => !cancelled && r && setResolved(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src, assets]);

  return <img {...rest} src={resolved} alt={alt ?? ""} loading="lazy" />;
}
