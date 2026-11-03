import React from "react";
import { Server, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ServerNode {
  name: string;
  role: string;
  status: "healthy" | "warning" | "down";
  cpu: number;
  memory: number;
  uptime: string;
}

const defaultServers: ServerNode[] = [
  { name: "Node-Teh-01", role: "Core API & Gateway", status: "healthy", cpu: 42, memory: 64, uptime: "۹۹.۹۸٪" },
  { name: "Node-DB-Cluster", role: "PostgreSQL Primary", status: "healthy", cpu: 58, memory: 78, uptime: "۹۹.۹۹٪" },
  { name: "Node-AI-Inference", role: "Voice & OCR Engine", status: "warning", cpu: 89, memory: 84, uptime: "۹۹.۴۵٪" },
  { name: "Node-Storage-Sync", role: "PACS & Object Store", status: "healthy", cpu: 28, memory: 46, uptime: "۱۰۰٪" },
];

export function ServerStatusCard({ servers = defaultServers }: { servers?: ServerNode[] }) {
  return (
    <Card className="border-border/60 shadow-sm" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            وضعیت سرورها و نودهای پردازشی
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">پایش مداوم منابع و زمان در دسترس بودن زیرساخت ابری</CardDescription>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-0 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          تمامی سیستم‌ها آنلاین
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {servers.map((srv) => (
            <div
              key={srv.name}
              className="p-3.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{srv.name}</div>
                  <div className="text-[11px] text-muted-foreground">{srv.role}</div>
                </div>
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    srv.status === "healthy"
                      ? "bg-emerald-500"
                      : srv.status === "warning"
                      ? "bg-amber-500 animate-ping"
                      : "bg-destructive"
                  }`}
                  title={srv.status}
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>مصرف پردازنده (CPU)</span>
                  <span className="font-medium text-foreground">{srv.cpu}٪</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${srv.cpu > 80 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${srv.cpu}%` }}
                  />
                </div>

                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>حافظه موقت (RAM)</span>
                  <span className="font-medium text-foreground">{srv.memory}٪</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${srv.memory}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[11px] text-muted-foreground">
                <span>آپ‌تایم:</span>
                <span className="font-semibold text-foreground">{srv.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
