export type PlatformKey =
  | "wordpress"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "threads";

export type PlatformField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
  help?: string;
};

export type PlatformDefinition = {
  key: PlatformKey;
  name: string;
  description: string;
  color: string;
  docsUrl?: string;
  fields: PlatformField[];
};

export const PLATFORM_CATALOG: PlatformDefinition[] = [
  {
    key: "wordpress",
    name: "WordPress",
    description: "Đăng bài blog qua REST API (Application Password).",
    color: "#21759B",
    docsUrl: "https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/",
    fields: [
      {
        key: "siteUrl",
        label: "Site URL",
        type: "url",
        placeholder: "https://blog.example.com",
        required: true,
        help: "URL gốc WordPress (không có /wp-admin).",
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "admin",
        required: true,
      },
      {
        key: "accessToken",
        label: "Application Password",
        type: "password",
        placeholder: "xxxx xxxx xxxx xxxx",
        required: true,
        help: "Users → Profile → Application Passwords.",
      },
    ],
  },
  {
    key: "facebook",
    name: "Facebook Page",
    description: "Đăng bài lên Fanpage qua Graph API.",
    color: "#1877F2",
    docsUrl: "https://developers.facebook.com/docs/pages/publishing",
    fields: [
      {
        key: "accountId",
        label: "Page ID",
        type: "text",
        placeholder: "123456789012345",
        required: true,
      },
      {
        key: "accountName",
        label: "Tên Page",
        type: "text",
        placeholder: "Roni Media",
      },
      {
        key: "accessToken",
        label: "Page Access Token",
        type: "password",
        placeholder: "EAAxxxx...",
        required: true,
        help: "Token từ Meta for Developers (pages_manage_posts).",
      },
    ],
  },
  {
    key: "instagram",
    name: "Instagram Business",
    description: "Đăng feed/carousel qua Instagram Graph API.",
    color: "#E4405F",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    fields: [
      {
        key: "accountId",
        label: "Instagram Business Account ID",
        type: "text",
        placeholder: "17841...",
        required: true,
      },
      {
        key: "accountName",
        label: "Username",
        type: "text",
        placeholder: "@roni.workplace",
      },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        required: true,
        help: "Token Meta có quyền instagram_content_publish.",
      },
    ],
  },
  {
    key: "tiktok",
    name: "TikTok",
    description: "Kết nối Content Posting API (Business).",
    color: "#000000",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    fields: [
      {
        key: "accountName",
        label: "TikTok Username",
        type: "text",
        placeholder: "@roni.creator",
      },
      {
        key: "clientKey",
        label: "Client Key",
        type: "text",
        required: true,
      },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        required: true,
      },
    ],
  },
  {
    key: "youtube",
    name: "YouTube",
    description: "Upload / mô tả video qua YouTube Data API.",
    color: "#FF0000",
    docsUrl: "https://developers.google.com/youtube/v3/docs",
    fields: [
      {
        key: "accountName",
        label: "Tên kênh",
        type: "text",
        placeholder: "Roni Channel",
      },
      {
        key: "accountId",
        label: "Channel ID",
        type: "text",
        placeholder: "UCxxxx",
        required: true,
      },
      {
        key: "accessToken",
        label: "OAuth Access Token",
        type: "password",
        required: true,
        help: "Token Google OAuth với scope youtube.upload.",
      },
    ],
  },
  {
    key: "threads",
    name: "Threads",
    description: "Đăng text/media lên Threads API.",
    color: "#000000",
    docsUrl: "https://developers.facebook.com/docs/threads",
    fields: [
      {
        key: "accountId",
        label: "Threads User ID",
        type: "text",
        required: true,
      },
      {
        key: "accountName",
        label: "Username",
        type: "text",
        placeholder: "@roni",
      },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        required: true,
      },
    ],
  },
];

export function getPlatformDef(key: string) {
  return PLATFORM_CATALOG.find((p) => p.key === key);
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return null;
  if (value.length < 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
