import { miniAppHost } from "@farcaster/miniapp-sdk";

/**
 * Send custom events to the Startale App host via the Comlink proxy.
 *
 * `miniAppHost` is the raw Comlink `wrap()` proxy — any method exposed on
 * the host object (including custom ones like `onMiniAppEvent`) can be
 * called through it, unlike `sdk.actions` which only has SDK-defined methods.
 */
export function useMiniAppEvent() {
  const sendMiniAppEvent = async (eventName: string, data?: unknown) => {
    const host = miniAppHost as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>;
    try {
      await host.onMiniAppEvent?.(eventName, data);
    } catch (e) {
      console.error("[MiniAppEvent] Failed to send event:", eventName, e);
    }
  };

  return { sendMiniAppEvent };
}
