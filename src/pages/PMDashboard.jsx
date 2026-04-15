/**
 * PMDashboard — final refactored version.
 *
 * CHANGES from previous pass:
 *  - handleLogout    → useLogout() hook
 *  - Socket enabled  → useSocket() (was commented out; now active via hook)
 *  - api.get("/campaign/get") → fetchCampaigns() service
 *  - api.post("/user/delete") → deleteUser() service
 *  - CreateUserForm  → <CreateUserForm allowedRoles={[...]}> (replaces local form)
 *  - UserCard        → <UserCard showDetails>
 *  - CampaignsTable  → <CampaignsTable> (already extracted)
 *  - ActionModal     → <ActionModal> (already extracted)
 *  - DeleteUserModal → <DeleteUserModal> (already extracted)
 */
import { useEffect, useState, useCallback, useMemo } from "react";

import useAuthStore  from "../stores/useAuthStore.js";
import useNotifStore from "../stores/useNotificationStore.js";

import { useResponsive }          from "../hooks/useResponsive.js";
import { useSocket }              from "../hooks/useSocket.js";
import { useLogout }              from "../hooks/useLogout.js";
import { T }                      from "../constants/theme.js";
import { fetchCampaigns }         from "../services/campaignService.js";
import { fetchUsers, deleteUser } from "../services/userService.js";
import api                        from "../api/axios.js";

import OpsGlobalStyles  from "../components/common/OpsGlobalStyles.jsx";
import GoldBtn          from "../components/common/GoldBtn.jsx";
import DashboardSidebar from "../components/layout/DashboardSidebar.jsx";
import DashboardHeader  from "../components/layout/DashboardHeader.jsx";
import ActionModal      from "../components/campaigns/ActionModal.jsx";
import CampaignsTable   from "../components/campaigns/CampaignsTable.jsx";
import DeleteUserModal  from "../components/users/DeleteUserModal.jsx";
import CreateUserForm   from "../components/users/CreateUserForm.jsx";
import UserCard         from "../components/users/UserCard.jsx";

export default function PMDashboard() {
  const user            = useAuthStore(s => s.user);
  const addNotification = useNotifStore(s => s.addNotification);
  const handleLogout    = useLogout();
  const isMobile        = useResponsive();

  const [activeSection, setActiveSection] = useState("campaigns");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const [campaigns,    setCampaigns]    = useState([]);
  const [camLoading,   setCamLoading]   = useState(true);
  const [actionTarget, setActionTarget] = useState(null);

  const [users,        setUsers]        = useState([]);
  const [userLoading,  setUserLoading]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ── Socket — now active (was commented out in original) ──────────────── */
  useSocket({
    "campaign:created": c => { setCampaigns(p => [c, ...p]);                                   addNotification("New campaign created");    },
    "campaign:updated": c => { setCampaigns(p => p.map(x => x._id === c._id ? c : x));        addNotification("Campaign updated");        },
    "campaign:deleted": d => { setCampaigns(p => p.filter(x => x._id !== d._id)); },
    "campaign:it_ack":  c => { setCampaigns(p => p.map(x => x._id === c._id ? c : x));        addNotification("IT acknowledged campaign"); },
  });

  const loadCampaigns = useCallback(async () => {
    setCamLoading(true);
    try   { setCampaigns(await fetchCampaigns()); }
    catch { addNotification("Failed to load campaigns"); }
    finally { setCamLoading(false); }
  }, [addNotification]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const data = await fetchUsers();
      if (data) {
        setUsers(data);
      } else {
        const map = new Map();
        campaigns.forEach(c => {
          if (c.createdBy && !map.has(c.createdBy._id ?? c.createdBy)) {
            const u = typeof c.createdBy === "object" ? c.createdBy : { _id: c.createdBy };
            map.set(u._id, u);
          }
        });
        setUsers([...map.values()]);
      }
    } finally { setUserLoading(false); }
  }, [campaigns]);

  useEffect(() => {
    if (activeSection === "ppc-users") loadUsers();
  }, [activeSection, loadUsers]);

  const openRequests   = useMemo(() => campaigns.filter(c => c.action === "approve" && !c.acknowledgement), [campaigns]);
  const closedRequests = useMemo(() => campaigns.filter(c => c.status === "cancel" || c.action === "cancel" || c.acknowledgement), [campaigns]);

  const goTo = section => { setActiveSection(section); setSidebarOpen(false); };

  const handleAction = useCallback(async (campaignId, { action, pmMessage, scheduleAt }) => {
    const res = await api.post("/campaign/update", {
      campaignId, action,
      pmMessage:  pmMessage  || undefined,
      scheduleAt: scheduleAt || undefined,
    });
    const updated = res.data?.data;
    if (updated) {
      setCampaigns(prev => prev.map(c => c._id === updated._id ? updated : c));
      addNotification(action === "approve" ? "Campaign approved — forwarded to IT" : "Campaign cancelled");
    }
  }, [addNotification]);

  const handleDeleteUser = useCallback(async id => {
    await deleteUser(id);
    setUsers(prev => prev.filter(u => u._id !== id));
    addNotification("User deleted successfully");
  }, [addNotification]);

  const handleUserCreated = useCallback(username => {
    addNotification(`User "${username}" created`);
  }, [addNotification]);

  const NAV = [
    { id: "campaigns",       label: "Campaigns",       count: campaigns.length       },
    { id: "ppc-users",       label: "PPC Users",       count: null                  },
    { id: "manage-users",    label: "Manage Users",    count: null                  },
    { id: "open-requests",   label: "Open Requests",   count: openRequests.length   },
    { id: "closed-requests", label: "Closed Requests", count: closedRequests.length },
  ];

  const SECTION_TITLE = {
    campaigns:        "Campaigns",
    "ppc-users":      "PPC Users",
    "manage-users":   "Manage Users",
    "open-requests":  "Open Requests",
    "closed-requests":"Closed Requests",
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans',sans-serif" }}>
      <OpsGlobalStyles />

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, zIndex:7999, background:"rgba(0,0,0,0.72)" }} />
      )}

      <DashboardSidebar brandSub="PM PANEL" navItems={NAV} activeSection={activeSection}
        onNavigate={goTo} user={user} role="process manager" onLogout={handleLogout}
        isMobile={isMobile} open={sidebarOpen} />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <DashboardHeader isMobile={isMobile} onMenuToggle={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
          title={SECTION_TITLE[activeSection] || "Dashboard"}
          subLabel="— PROCESS MANAGER" />

        <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>

          {activeSection === "campaigns" && (
            <div style={{ animation:"opsFadeUp .22s ease" }}>
              <CampaignsTable campaigns={campaigns} loading={camLoading}
                onAction={setActionTarget} isMobile={isMobile}
                title="ALL CAMPAIGNS" showActionBtn />
            </div>
          )}

          {activeSection === "ppc-users" && (
            <div style={{ animation:"opsFadeUp .22s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div style={{ padding:"2px 10px", borderRadius:2, background:T.goldDim, border:`1px solid ${T.goldBorder}`, fontSize:9, color:T.gold, fontFamily:"'JetBrains Mono',monospace" }}>{users.length} users loaded</div>
                <GoldBtn variant="outline" onClick={loadUsers}>REFRESH</GoldBtn>
              </div>

              {userLoading ? (
                <div style={{ padding:"52px 20px", textAlign:"center", color:T.muted }}>
                  <div style={{ marginBottom:10, color:T.gold, fontSize:22 }}>◈</div>Loading users…
                </div>
              ) : users.length === 0 ? (
                <div style={{ padding:"52px 20px", textAlign:"center", background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4 }}>
                  <div style={{ fontSize:24, color:T.subtle, marginBottom:12, fontFamily:"'Cinzel',serif" }}>◇</div>
                  <p style={{ margin:0, fontSize:14, color:T.white, fontFamily:"'Cinzel',serif" }}>No Users Found</p>
                  <p style={{ margin:"6px 0 20px", fontSize:13, color:T.muted }}>Create users from the Manage Users section.</p>
                  <GoldBtn variant="outline" onClick={() => goTo("manage-users")}>CREATE USER</GoldBtn>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
                  {users.map(u => (
                    <UserCard key={u._id} user={u} showDetails
                      onDelete={target => setDeleteTarget(target)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "manage-users" && (
            <div style={{ animation:"opsFadeUp .22s ease", maxWidth:540 }}>
              <div style={{ padding:"13px 18px", marginBottom:22, border:`1px solid ${T.goldBorder}`, borderRadius:4, background:T.bgCard }}>
                <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                  As a Process Manager, you can create Manager, IT, and other Process Manager accounts.
                  Managers can create PPC users within their team.
                </p>
              </div>
              <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, padding: isMobile ? "22px 18px" : "28px 26px 24px" }}>
                <h2 style={{ margin:"0 0 22px", fontSize:15, fontWeight:600, color:T.white, fontFamily:"'Cinzel',serif", letterSpacing:"0.08em" }}>Create User Account</h2>
                <CreateUserForm
                  allowedRoles={["manager", "process manager", "it"]}
                  onSuccess={handleUserCreated} />
              </div>
            </div>
          )}

          {activeSection === "open-requests" && (
            <div style={{ animation:"opsFadeUp .22s ease" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20, padding:"12px 18px", background:T.bgCard, border:`1px solid ${T.teal}33`, borderRadius:4 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:T.teal, flexShrink:0, boxShadow:`0 0 8px ${T.teal}` }} />
                <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                  These campaigns have been <strong style={{ color:T.teal }}>approved</strong> and are waiting for IT acknowledgement.
                </p>
              </div>
              <CampaignsTable campaigns={openRequests} loading={camLoading}
                onAction={setActionTarget} isMobile={isMobile}
                title="OPEN · AWAITING IT ACK" showActionBtn={false} />
            </div>
          )}

          {activeSection === "closed-requests" && (
            <div style={{ animation:"opsFadeUp .22s ease" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20, padding:"12px 18px", background:T.bgCard, border:`1px solid ${T.subtle}`, borderRadius:4 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:T.muted, flexShrink:0 }} />
                <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                  These campaigns are <strong style={{ color:T.text }}>closed</strong> — cancelled or acknowledged by IT.
                </p>
              </div>
              <CampaignsTable campaigns={closedRequests} loading={camLoading}
                onAction={setActionTarget} isMobile={isMobile}
                title="CLOSED · PROCESSED" showActionBtn={false} />
            </div>
          )}
        </div>
      </main>

      {actionTarget && <ActionModal campaign={actionTarget} onClose={() => setActionTarget(null)} onSave={handleAction} />}
      {deleteTarget  && <DeleteUserModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={id => handleDeleteUser(id)} />}
    </div>
  );
}
