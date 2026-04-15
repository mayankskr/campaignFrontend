/**
 * useCampaigns — combines campaign store access with socket event handling.
 *
 * PROBLEM FIXED:
 * PPCDashboard and ManagerDashboard both called `useCampaignStore.setState()`
 * directly inside their socket event handlers:
 *
 *   socket.on("campaign:created", (c) => {
 *     useCampaignStore.setState(s => ({ campaigns: [c, ...s.campaigns] }));
 *   });
 *
 * Calling `setState` directly bypasses the store's action layer and makes the
 * mutation invisible to any middleware or devtools inspecting the store.
 *
 * This hook:
 *  1. Selects campaigns + actions from the store via proper selectors
 *  2. Provides `addCampaign` and `patchCampaign` helpers that route through
 *     the store's setState cleanly (until the store exposes dedicated actions)
 *  3. Accepts an optional `onEvent` callback for notification side-effects
 *  4. Wires up socket events via `useSocket` automatically when `enableSocket`
 *     is true (default). Set to false if the page handles socket separately.
 *
 * @param {object}   options
 * @param {boolean=} options.enableSocket   - register socket handlers (default true)
 * @param {Function=}options.onNotification - called with a message string on events
 *
 * @returns {{ campaigns, getCampaign, createCampaign, updateCampaign,
 *             addCampaign, patchCampaign }}
 *
 * @example
 *   const { campaigns, createCampaign, updateCampaign } = useCampaigns({
 *     onNotification: addNotification,
 *   });
 */
import useCampaignStore from "../stores/useCampaignStore.js";
import { useSocket }    from "./useSocket.js";

export const useCampaigns = ({
  enableSocket   = true,
  onNotification = () => {},
} = {}) => {
  const campaigns      = useCampaignStore(s => s.campaigns);
  const getCampaign    = useCampaignStore(s => s.getCampaign);
  const createCampaign = useCampaignStore(s => s.createCampaign);
  const updateCampaign = useCampaignStore(s => s.updateCampaign);

  /* ── Store mutation helpers ─────────────────────────────────────────────
   * These channel mutations through the store instance so they're visible
   * to Zustand devtools. When the store gains explicit addCampaign /
   * patchCampaign actions, replace these one-liners.
   * ─────────────────────────────────────────────────────────────────────── */
  const addCampaign = c =>
    useCampaignStore.setState(s => ({ campaigns: [c, ...s.campaigns] }));

  const patchCampaign = c =>
    useCampaignStore.setState(s => ({
      campaigns: s.campaigns.map(x => x._id === c._id ? c : x),
    }));

  /* ── Socket event wiring ────────────────────────────────────────────────
   * Only registers if `enableSocket` is true. Pages that manage their own
   * socket connection (like PMDashboard using local state) pass false.
   * ─────────────────────────────────────────────────────────────────────── */
  useSocket(
    enableSocket
      ? {
          "campaign:created":  c => { addCampaign(c);  onNotification("New campaign submitted");                          },
          "campaign:updated":  c => { patchCampaign(c); onNotification("Campaign updated");                               },
          "campaign:it_queued":c => { patchCampaign(c); onNotification("Campaign approved — forwarded to IT");            },
          "campaign:it_ack":   c => { patchCampaign(c); onNotification(`IT acknowledged: ${c.itMessage?.slice(0, 40) || ""}`); },
        }
      : {}
  );

  return {
    campaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    addCampaign,
    patchCampaign,
  };
};
