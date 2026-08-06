"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function acceptTermsCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `commons_terms_accepted=true; path=/; max-age=${oneYear}`;
}

export default function WelcomeContent({
  code,
  neighborhoodName,
  isLoggedIn,
}: {
  code: string | null;
  neighborhoodName: string | null;
  isLoggedIn: boolean;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const badCode = Boolean(code) && !neighborhoodName;
  const noEntryPoint = !isLoggedIn && !code;
  const blocked = badCode || noEntryPoint;

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

function handleContinue() {
  acceptTermsCookie();
  if (isLoggedIn) {
    window.location.href = code ? `/join?code=${encodeURIComponent(code)}` : "/browse";
    return;
  }
  const codeParam = code ? `?code=${encodeURIComponent(code)}` : "";
  window.location.href = code ? `/signup${codeParam}` : "/login";
}

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <span className="commons-heading self-center text-4xl">
        {neighborhoodName ? `${neighborhoodName} Commons` : "commons"}
      </span>

      {badCode && (
        <p className="mt-2 text-center font-mono text-xs text-commons-brick">
          That invite link doesn&apos;t match a neighborhood — double check
          it with whoever sent it.
        </p>
      )}
      {noEntryPoint && (
        <p className="mt-2 text-center font-mono text-xs text-commons-brick">
          This link is missing an invite code, so we can&apos;t tell which
          neighborhood you&apos;re joining.
        </p>
      )}

      <div className="commons-card-flat mt-6 p-5">
        <h2 className="commons-heading mb-2 text-xl">Note about install &amp; verification</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>
            This app uses PWA for direct install (this is because it&apos;s so
            local and radical, it&apos;s not even in any app store!)
          </li>
          <li>
            The email verification comes from Supabase (this is just the
            database engine and its own authentication protocol — which is
            easier than setting up another integration for email).
          </li>
        </ul>
        <p className="mt-3 text-sm">
          Not a Central Tacoma resident? {" "}
          <a
            href="mailto:stovall.joshua@gmail.com?subject=Requesting%20a%20Commons%20invite%20link"
            className="font-mono text-xs font-bold underline"
          >
            Click here to request the link for your neighborhood.
          </a>
        </p>
      </div>

      <div className="commons-card-flat mt-4 p-5">
        <h2 className="commons-heading mb-2 text-xl">Expectations for use</h2>
        <p className="mb-2 text-sm">
          Be a &ldquo;good neighbor&rdquo; in the Commons, which generally
          means:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>
            Be kind (hateful, bigoted, harmful and generally offensive content
            is prohibited. If you&apos;re not sure if something you want to
            post is offensive, that&apos;s probably a good indicator that you
            should keep it to yourself)
          </li>
          <li>
            Don&apos;t share items that are illegal or specially regulated
            (e.g. things like weapons or drugs)
          </li>
          <li>
            Don&apos;t borrow items to do illegal things (e.g. borrowing a
            ski-mask and duffle bag to use in a robbery)
          </li>
          <li>
            Quickly return items after use (indefinite borrowing is the same
            as stealing)
          </li>
          <li>
            Take good care of the borrowed items and be willing to
            repair/replace if you accidentally break something
          </li>
          <li>
            Be especially careful with items that can cause bodily or
            psychological harm (e.g. a saw or a self-help guide)
          </li>
          <li>
            Try to assume the best in others and work toward shared
            resolutions when accidents happen or conflicts occur
          </li>
        </ul>
      </div>

      <div className="commons-card-flat mt-4 p-5">
        <h2 className="commons-heading mb-2 text-xl">
          Risk and responsibility are shared
        </h2>
        <p className="text-sm">
          Sometimes people can act un-neighborly (generally defined here as
          the opposite of being a good neighbor). They might not return
          something. They might say something rude or offensive. In this app
          users can report bad behavior and moderators/admins can
          remove/hide content or, when necessary, remove users acting
          un-neighborly.
        </p>
        <p className="mt-3 text-sm">
          To be clear, this is a reactive approach, not a proactive one — it
          assumes the best in people and that users are willing to take some
          risk, trusting and supporting one another, without assurances about
          that experience. It also implies that access is dependent on
          behavior. Use your best judgement when deciding what to share, and
          report issues when people act in un-neighborly ways. We&apos;ll
          take care of it as quickly as possible.
        </p>
        <p className="mt-3 text-sm">
          And to be extra clear, what that really means is that I, the app
          owner/manager, will do what I reasonably can to prevent bad
          content, assigning moderators, mitigating reported issues quickly,
          and applying updates that improve moderation when needed. However,
          I can&apos;t take responsibility for what users do — that&apos;s not
          an excuse or deflection, it&apos;s just a shared risk and duty among
          all users.
        </p>
      </div>

      <div className="commons-card-flat mt-4 p-5">
        <h2 className="commons-heading mb-2 text-xl">Accept and install</h2>

        {blocked ? (
          <p className="text-sm">
            We can&apos;t continue without a valid neighborhood link. Ask
            whoever invited you to resend it, or use the request link above.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm">
              If you&apos;re okay with that shared risk and responsibility
              and feel like you can be a good neighbor, click install to
              begin!
            </p>

            <label className="mb-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 border-2 border-commons-ink"
              />
              I&apos;ve read this and agree to be a good neighbor.
            </label>

            {isStandalone ? (
              <button
                disabled={!agreed}
                onClick={handleContinue}
                className="commons-button w-full text-sm disabled:opacity-40"
              >
                Continue
              </button>
            ) : isIOS ? (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-xs">
                  On iPhone: tap the Share icon <strong>⬆️</strong> in
                  Safari, then choose{" "}
                  <strong>&ldquo;Add to Home Screen.&rdquo;</strong>
                </p>
                <button
                  disabled={!agreed}
                  onClick={handleContinue}
                  className="commons-button w-full text-sm disabled:opacity-40"
                >
                  Got it — continue
                </button>
              </div>
            ) : deferredPrompt ? (
              <button
                disabled={!agreed}
                onClick={async () => {
                  await handleInstallClick();
                  handleContinue();
                }}
                className="commons-button w-full text-sm disabled:opacity-40"
              >
                Install Commons
              </button>
            ) : (
              <button
                disabled={!agreed}
                onClick={handleContinue}
                className="commons-button w-full text-sm disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}