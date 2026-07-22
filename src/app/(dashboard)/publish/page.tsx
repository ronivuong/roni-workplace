import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Globe, Users, ImageIcon } from "lucide-react";

export const metadata = { title: "Publish Hub" };

const channels = [
  { name: "WordPress", desc: "Đăng bài blog & landing", status: "Sẵn sàng kết nối", icon: Globe },
  { name: "Facebook", desc: "Page posts & reels", status: "Sắp ra mắt", icon: Users },
  { name: "Instagram", desc: "Feed, carousel, stories", status: "Sắp ra mắt", icon: ImageIcon },
  { name: "TikTok", desc: "Video ngắn & caption", status: "Sắp ra mắt", icon: Share2 },
];

export default function PublishPage() {
  return (
    <div>
      <PageHeader
        title="Publish Hub"
        description="Xuất bản nội dung lên WordPress và các nền tảng social chỉ với một click."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((ch) => (
          <Card key={ch.name} className="hover:border-emerald-200 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ch.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{ch.name}</CardTitle>
                <p className="text-xs text-slate-500">{ch.desc}</p>
              </div>
              <Badge variant="secondary">{ch.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Kết nối OAuth / API token trong phase tiếp theo. Lịch sử đăng bài và
                thông báo PUBLISH_SUCCESS đã được seed sẵn.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
