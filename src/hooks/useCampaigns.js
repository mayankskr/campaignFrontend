/**
 * useCampaigns — campaign store + socket event wiring.
 *
 * FIX: notification messages now use `c.performerName` injected by the
 * backend socket payload (see backend socket.js and campaignService.js).
 * Messages are context-aware: "cancelled" shows different text than "updated".
 */
import useCampaignStore from "../stores/useCampaignStore.js";
import { useSocket }    from "./useSocket.js";

export const useCampaigns = ({
  enableSocket    = true,
  onNotification  = () => {},
} = {}) => {
  const campaigns      = useCampaignStore(s => s.campaigns);
  const getCampaign    = useCampaignStore(s => s.getCampaign);
  const createCampaign = useCampaignStore(s => s.createCampaign);
  const updateCampaign = useCampaignStore(s => s.updateCampaign);

  // ── Store mutation helpers ───────────────────────────────────────────────────
  const addCampaign = c =>
    useCampaignStore.setState(s => ({ campaigns: [c, ...s.campaigns] }));

  const patchCampaign = c =>
    useCampaignStore.setState(s => ({
      campaigns: s.campaigns.map(x => x._id === c._id ? c : x),
    }));

  // ── Socket handlers ──────────────────────────────────────────────────────────
  useSocket(
    enableSocket
      ? {
          /**
           * campaign:created — emitted by PPC or Manager.
           * performerName is the username of whoever created it.
           */
          "campaign:created": c => {
            addCampaign(c);
            onNotification(`Campaign created by ${c.performerName || "someone"}`);
          },

          /**
           * campaign:updated — emitted by PPC, Manager, or PM (cancel).
           * Distinguish "cancelled" from generic "updated" for clearer UX.
           */
          "campaign:updated": c => {
            patchCampaign(c);
            const msg =
              c.status === "cancel"
                ? `Campaign cancelled by ${c.performerName || "someone"}`
                : `Campaign updated by ${c.performerName || "someone"}`;
            onNotification(msg);
          },

          /**
           * campaign:it_queued — PM approved campaign and forwarded to IT.
           */
          "campaign:it_queued": c => {
            patchCampaign(c);
            onNotification(
              `Campaign approved by ${c.performerName || "PM"} — forwarded to IT`,
            );
          },

          /**
           * campaign:it_ack — IT acknowledged (done or not done).
           */
          "campaign:it_ack": c => {
            patchCampaign(c);
            const msg =
              c.acknowledgement === "done"
                ? `${c.performerName || "IT"} marked campaign as Done`
                : `${c.performerName || "IT"} could not complete campaign`;
            onNotification(msg);
          },
        }
      : {},
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