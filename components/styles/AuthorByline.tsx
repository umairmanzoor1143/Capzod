import type { CommunitySubtitleStyle } from "@/lib/community-styles";
import { cn } from "@/lib/utils";

export function AuthorByline({
  style,
  className,
  badgeClassName,
}: {
  style: Pick<CommunitySubtitleStyle, "authorName" | "authorIsAdmin">;
  className?: string;
  badgeClassName?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">by {style.authorName}</span>
      {style.authorIsAdmin ? (
        <img
          src="/badge.png"
          alt="Admin"
          title="Admin"
          className={cn("size-3 shrink-0 object-contain", badgeClassName)}
        />
      ) : null}
    </span>
  );
}
