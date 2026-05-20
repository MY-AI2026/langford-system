"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/reg-notification-service";
import { RegNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bell, BellRing, CheckCheck, Mail, MailCheck } from "lucide-react";

/**
 * Notification drawer for admins. Polls every 15s via the registered
 * subscription — no Firestore SDK / WebSocket, in line with the rest
 * of the app's REST architecture.
 */
export function NotificationBell() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState<RegNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAdminNotifications(setItems, { limit: 20 });
    return () => unsub();
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  async function handleClickItem(notif: RegNotification) {
    if (!firebaseUser) return;
    if (!notif.isRead) {
      try {
        await markNotificationRead(notif.id, firebaseUser.uid);
      } catch (e) {
        console.warn("[notification-bell] mark-read failed:", e);
      }
    }
    setOpen(false);
    router.push(notif.link);
  }

  async function handleMarkAll() {
    if (!firebaseUser) return;
    const unreadIds = items.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await markAllNotificationsRead(unreadIds, firebaseUser.uid);
    } catch (e) {
      console.warn("[notification-bell] mark-all failed:", e);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`الإشعارات${hasUnread ? ` (${unreadCount} غير مقروءة)` : ""}`}
        className="relative"
      >
        {hasUnread ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {hasUnread && (
          <Badge
            className="absolute -end-1 -top-1 h-5 min-w-5 justify-center border-0 bg-destructive p-0 text-[10px] text-destructive-foreground"
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-96 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <SheetTitle>الإشعارات</SheetTitle>
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAll}
                  className="text-xs"
                >
                  <CheckCheck className="ml-1 h-4 w-4" />
                  علّم الكل كمقروء
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto" dir="rtl">
            {items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">مفيش إشعارات.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((notif) => (
                  <li key={notif.id}>
                    <button
                      onClick={() => handleClickItem(notif)}
                      className={[
                        "flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50",
                        notif.isRead ? "" : "bg-primary/5",
                      ].join(" ")}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.isRead ? (
                          <MailCheck className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{notif.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notif.body}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{formatRelative(notif.createdAt)}</span>
                          {notif.emailSent && (
                            <Badge variant="secondary" className="border-0 text-[10px]">
                              تم إرسال إيميل
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function formatRelative(value: unknown): string {
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    d = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === "string") {
    const tmp = new Date(value);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }
  if (!d) return "—";

  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "دلوقتي";
  if (min < 60) return `من ${min} دقيقة`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `من ${hr} ساعة`;
  const day = Math.round(hr / 24);
  if (day < 30) return `من ${day} يوم`;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
