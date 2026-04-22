export function SmartLink({
  href,
  children,
  onNavigate,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  onNavigate?: (href: string) => void;
}) {
  const isAnchor = href?.startsWith("#");
  const isExternal = /^https?:/.test(href ?? "");
  const isRelative = !isAnchor && !isExternal && !!href;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAnchor || isExternal) return;
    if (isRelative && onNavigate && href) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  return (
    <a
      {...rest}
      href={href}
      onClick={handleClick}
      target={isExternal ? "_blank" : rest.target}
      rel={isExternal ? "noopener noreferrer" : rest.rel}
    >
      {children}
    </a>
  );
}
