/**
 * Status filter card configuration.
 * Previously defined inline in PPCDashboard, ManagerDashboard, and PMDashboard (with 4 items).
 * The full 5-item set covers all statuses; PM's internal version only used 4 (no "not done").
 */
import { T } from "./theme.js";

/** Full filter set — used by PPC and Manager dashboards */
export const FILTER_CARDS = [
  { id: "transfer",  label: "In Review",  color: T.blue,  bg: T.blueBg  },
  { id: "approve",   label: "Approved",   color: T.teal,  bg: T.tealBg  },
  { id: "done",      label: "Done",       color: T.green, bg: T.greenBg },
  { id: "cancel",    label: "Cancelled",  color: T.red,   bg: T.redBg   },
  { id: "not done",  label: "Not Done",   color: T.amber, bg: T.amberBg },
];

/** 4-item set used inside PM's self-contained CampaignsTable */
export const PM_FILTER_CARDS = [
  { id: "transfer",  label: "In Review",  color: T.blue,  bg: T.blueBg  },
  { id: "approve",   label: "Approved",   color: T.teal,  bg: T.tealBg  },
  { id: "done",      label: "Done",       color: T.green, bg: T.greenBg },
  { id: "cancel",    label: "Cancelled",  color: T.red,   bg: T.redBg   },
];
