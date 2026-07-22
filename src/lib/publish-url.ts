/**
 * Build a public post URL for a published piece of content.
 * Uses platform connection metadata when available; falls back to canonical platform URLs.
 */
export function buildPublishedUrl(input: {
  contentId: string;
  title: string;
  platform: string | null | undefined;
  accountId?: string | null;
  accountName?: string | null;
  config?: Record<string, string> | null;
  explicitUrl?: string | null;
}): string {
  if (input.explicitUrl && /^https?:\/\//i.test(input.explicitUrl)) {
    return input.explicitUrl;
  }

  const platform = (input.platform || "blog").toLowerCase();
  const id = input.contentId;
  const short = id.slice(-10);
  const handle = (input.accountName || "roni.creator").replace(/^@/, "");
  const slug = slugify(input.title) || short;

  switch (platform) {
    case "wordpress": {
      const site = (
        input.accountId ||
        input.config?.siteUrl ||
        "https://blog.roni.vn"
      ).replace(/\/$/, "");
      return `${site}/${slug}/`;
    }
    case "blog":
      return `https://blog.roni.vn/${slug}/`;
    case "facebook": {
      const pageId = input.accountId || "roni.workplace";
      return `https://www.facebook.com/${pageId}/posts/${short}`;
    }
    case "instagram":
      return `https://www.instagram.com/p/${short}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}/video/${short}`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${short}`;
    case "threads":
      return `https://www.threads.net/@${handle}/post/${short}`;
    default:
      return `https://roni.vn/p/${slug}`;
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
