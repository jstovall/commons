"use client";

import { useState, useTransition } from "react";
import { updateNotificationChannel } from "@/app/actions";

export default function NotificationChannelToggle({
  currentChannel,
  isInstalledAndSubscribed,
}: {
  currentChannel: string;
  isInstalledAndSubscribed: boolean;
}) {
  const [channel, setChannel] = useState(currentChannel);
  const [isPending, startTransition] = useTransition();

  function handleChange(newChannel: string) {
    startTransition(async () => {
      await updateNotificationChannel(newChannel);
      setChannel(newChannel);
    });
  }

  return (
    <div className="commons-card-flat p-4">
      <p className="font-mono text-xs font-bold uppercase">Notifications</p>

      <div className="mt-2 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={channel === "email"}
            onChange={() => handleChange("email")}
            disabled={isPending}
            className="h-4 w-4"
          />
          Email me
        </label>

        {isInstalledAndSubscribed ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={channel === "push"}
              onChange={() => handleChange("push")}
              disabled={isPending}
              className="h-4 w-4"
            />
            Push notifications (on this device)
          </label>
        ) : (
          <p className="font-mono text-xs text-commons-ink/60">
            Add Commons to your home screen and enable notifications to
            switch to push instead of email.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={channel === "off"}
            onChange={() => handleChange("off")}
            disabled={isPending}
            className="h-4 w-4"
          />
          Don&apos;t notify me
        </label>
      </div>
    </div>
  );
}