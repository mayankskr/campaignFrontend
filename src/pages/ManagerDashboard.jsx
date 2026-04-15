/**
 * ManagerDashboard — final refactored version.
 *
 * CHANGES from previous pass:
 *  - handleLogout             → useLogout() hook
 *  - socket + setState calls  → useCampaigns({ onNotification })
 *  - Filter cards grid        → <FilterCardsGrid>
 *  - Table toolbar            → <TableToolbar>
 *  - "No Records Found"       → <EmptyState>
 *  - "PENDING" inline badge   → <PendingBadge>
 *  - Team chip JSX variable   → <TeamChip> component
 *  - createUser / deleteUser  → services/userService.js
 *  - loadTeamInfo             → useTeam() hook
 */
import { useEffect, useState, useCallback, useMemo } from "react";

import useAuthStore  from "../stores/useAuthStore.js";
import useNotifStore from "../stores/useNotificationStore.js";

import { useResponsive }           from "../hooks/useResponsive.js";
import { useCampaigns }            from "../hooks/useCampaigns.js";
import { useLogout }               from "../hooks/useLogout.js";
import { useTeam }                 from "../hooks/useTeam.js";
import { T, inputSx }             from "../constants/theme.js";
import { STATUS_META, ACTION_META } from "../constants/statusMeta.js";
import { FILTER_CARDS }            from "../constants/filterCards.js";
import { fmt, initials }           from "../utils/formatters.js";
import { createUser, deleteUser }  from "../services/userService.js";

import OpsGlobalStyles  from "../components/common/OpsGlobalStyles.jsx";
import StatusBadge      from "../components/common/StatusBadge.jsx";
import PendingBadge     from "../components/common/PendingBadge.jsx";
import EmptyState       from "../components/common/EmptyState.jsx";
import GoldBtn          from "../components/common/GoldBtn.jsx";
import Field            from "../components/common/Field.jsx";
import DashboardSidebar from "../components/layout/DashboardSidebar.jsx";
import DashboardHeader  from "../components/layout/DashboardHeader.jsx";
import TeamChip         from "../components/layout/TeamChip.jsx";
import FilterCardsGrid  from "../components/campaigns/FilterCardsGrid.jsx";
import TableToolbar     from "../components/campaigns/TableToolbar.jsx";
import UpdateModal      from "../components/campaigns/UpdateModal.jsx";
import DeleteUserModal  from "../components/users/DeleteUserModal.jsx";
import UserCard         from "../components/users/UserCard.jsx";

export default function ManagerDashboard() {
  const user            = useAuthStore(s => s.user);
  const addNotification = useNotifStore(s => s.addNotification);
  const handleLogout    = useLogout();
  const isMobile        = useResponsive();
  const { teamInfo, teamLoading, loadTeamInfo } = useTeam();

  const { campaigns, getCampaign, createCampaign, updateCampaign } = useCampaigns({
    onNotification: addNotification,
  });

  const [loading,       setLoading]       = useState(true);
  const [pageError,     setPageError]     = useState("");
  const [activeSection, setActiveSection] = useState("campaigns");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [updateTarget,  setUpdateTarget]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [statusFilter,  setStatusFilter]  = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [createForm,    setCreateForm]    = useState({ message: "", requestedAt: "" });
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [createOk,      setCreateOk]      = useState(false);
  const [userForm,      setUserForm]      = useState({ username: "", email: "", password: "" });
  const [creatingUser,  setCreatingUser]  = useState(false);
  const [userError,     setUserError]     = useState("");
  const [userOk,        setUserOk]        = useState(false);

  useEffect(() => {
    (async () => {
      try { await Promise.all([getCampaign(), loadTeamInfo()]); }
      catch { setPageError("Failed to load data. Please refresh."); }
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line

  const teamId = useMemo(() => {
    if (teamInfo?._id) return teamInfo._id;
    const raw = campaigns[0]?.teamId;
    return (typeof raw === "object" ? raw?._id : raw) || null;
  }, [teamInfo, campaigns]);

  const ppcMembers = useMemo(() =>
    teamInfo?.members?.filter(m => m.role === "ppc") ?? []
  , [teamInfo]);

  const stats = useMemo(() => ({
    transfer:   campaigns.filter(c => c.status  === "transfer").length,
    approve:    campaigns.filter(c => c.action  === "approve").length,
    done:       campaigns.filter(c => c.status  === "done").length,
    cancel:     campaigns.filter(c => c.status  === "cancel").length,
    "not done": campaigns.filter(c => c.status  === "not done").length,
  }), [campaigns]);

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (statusFilter) {
      list = statusFilter === "approve"
        ? list.filter(c => c.action === "approve")
        : list.filter(c => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.message?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [campaigns, statusFilter, searchQuery]);

  const goTo = section => {
    setActiveSection(section); setSidebarOpen(false);
    setCreateError(""); setCreateOk(false);
    setUserError(""); setUserOk(false);
  };

  const handleCreate = useCallback(async e => {
    e.preventDefault(); setCreateError(""); setCreateOk(false);
    if (!teamId)                    { setCreateError("Team not found. Please wait or refresh."); return; }
    if (!createForm.message.trim()) { setCreateError("Campaign message is required."); return; }
    setCreating(true);
    try {
      await createCampaign({ message: createForm.message.trim(), requestedAt: createForm.requestedAt || undefined, teamId });
      setCreateForm({ message: "", requestedAt: "" }); setCreateOk(true);
      addNotification("Campaign created successfully");
      setTimeout(() => { setActiveSection("campaigns"); setCreateOk(false); }, 1800);
    } catch (err) { setCreateError(err?.response?.data?.message || "Failed to create campaign."); }
    finally       { setCreating(false); }
  }, [teamId, createForm, createCampaign, addNotification]);

  const handleUpdate = useCallback(async (id, data) => {
    await updateCampaign(id, data);
    addNotification(data.status === "cancel" ? "Campaign cancelled" : "Campaign updated");
  }, [updateCampaign, addNotification]);

  const handleCreateUser = useCallback(async e => {
    e.preventDefault(); setUserError(""); setUserOk(false);
    if (!userForm.username || !userForm.email || !userForm.password) { setUserError("All fields are required."); return; }
    setCreatingUser(true);
    try {
      await createUser({ ...userForm, role: "ppc" });
      setUserForm({ username: "", email: "", password: "" }); setUserOk(true);
      addNotification(`PPC user "${userForm.username}" created`);
      await loadTeamInfo();
      setTimeout(() => setUserOk(false), 3000);
    } catch (err) { setUserError(err?.response?.data?.message || "Failed to create user."); }
    finally       { setCreatingUser(false); }
  }, [userForm, addNotification, loadTeamInfo]);

  const handleDeleteUser = useCallback(async id => {
    await deleteUser(id);
    addNotification("PPC user removed from team");
    await loadTeamInfo();
  }, [addNotification, loadTeamInfo]);

  const NAV = [
    { id: "campaigns", label: "Team Campaigns", count: campaigns.length },
    { id: "create",    label: "Create Campaign" },
    { id: "team",      label: "Team Members",   count: ppcMembers.length },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans',sans-serif" }}>
      <OpsGlobalStyles />

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, zIndex:7999, background:"rgba(0,0,0,0.72)" }} />
      )}

      <DashboardSidebar brandSub="MANAGER PANEL" navItems={NAV} activeSection={activeSection}
        onNavigate={goTo} user={user} role="manager" onLogout={handleLogout}
        isMobile={isMobile} open={sidebarOpen}
        extra={<TeamChip teamInfo={teamInfo} memberCount={ppcMembers.length} />} />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <DashboardHeader isMobile={isMobile} onMenuToggle={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
          title={{ campaigns:"Team Campaigns", create:"Create Campaign", team:"Team Members" }[activeSection] || "Dashboard"}
          subLabel="— MANAGER PANEL" />

        {pageError && <div style={{ margin:"16px 28px 0", padding:"10px 14px", background:T.redBg, border:`1px solid ${T.red}44`, borderRadius:3, color:T.red, fontSize:12 }}>{pageError}</div>}

        {/* ── CAMPAIGNS ───────────────────────────────────────────────── */}
        {activeSection === "campaigns" && (
          <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>
            <FilterCardsGrid cards={FILTER_CARDS} stats={stats} activeId={statusFilter}
              onSelect={id => setStatusFilter(p => p === id ? null : id)}
              isMobile={isMobile} />

            <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, overflow:"hidden", animation:"opsFadeUp .28s .05s ease both" }}>
              <TableToolbar title="TEAM CAMPAIGNS" count={filtered.length}
                search={searchQuery} onSearch={setSearchQuery}
                activeFilter={statusFilter} onClearFilter={() => setStatusFilter(null)}
                isMobile={isMobile} />

              {loading ? (
                <div style={{ padding:"52px 20px", textAlign:"center", color:T.muted, fontSize:13 }}>
                  <div style={{ marginBottom:10, color:T.gold, fontSize:22 }}>◈</div>Loading campaigns…
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  headline="No Records Found"
                  sub={searchQuery || statusFilter ? "Adjust your search or filter." : "No team campaigns yet."}
                  action={!searchQuery && !statusFilter ? <GoldBtn variant="outline" onClick={() => goTo("create")}>CREATE CAMPAIGN</GoldBtn> : null}
                />
              ) : (
                <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:920 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${T.subtle}`, background:`${T.bg}dd` }}>
                        {["SUBMITTED BY","TIMESTAMP","MESSAGE","PM COMMENT","STATUS","PM ACTION","REQUESTED","IT COMMENT","TICKET"].map(h => (
                          <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:9, fontWeight:600, color:T.gold, letterSpacing:"0.14em", fontFamily:"'Cinzel',serif", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => {
                        const creatorId = typeof c.createdBy === "object" ? c.createdBy?._id : c.createdBy;
                        const member    = teamInfo?.members?.find(m => m._id === creatorId);
                        const isOwn     = !member;
                        return (
                          <tr key={c._id} className="ops-row"
                            style={{ borderBottom:`1px solid ${T.subtle}22`, background: i%2===1 ? `${T.bgCard}88` : "transparent" }}>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <div style={{ width:22, height:22, borderRadius:"50%", background: isOwn ? T.goldDim : T.purpleBg, border:`1px solid ${isOwn ? T.gold : T.purple}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color: isOwn ? T.gold : T.purple, fontFamily:"'Cinzel',serif", flexShrink:0 }}>
                                  {initials(member?.username || user || "M")}
                                </div>
                                <span style={{ fontSize:11, color: isOwn ? T.gold : T.text }}>{member?.username || user || "—"}</span>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}><span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.createdAt)}</span></td>
                            <td style={{ padding:"12px 14px", minWidth:160, maxWidth:240 }}><p style={{ margin:0, fontSize:12, color:T.text, lineHeight:1.55, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{c.message}</p></td>
                            <td style={{ padding:"12px 14px", minWidth:130, maxWidth:200 }}>
                              {c.pmMessage ? <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.55, fontStyle:"italic", wordBreak:"break-word" }}>{c.pmMessage}</p>
                                : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                            </td>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}><StatusBadge value={c.status} meta={STATUS_META} /></td>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                              {c.action ? <StatusBadge value={c.action} meta={ACTION_META} /> : <PendingBadge />}
                            </td>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}><span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.requestedAt)}</span></td>
                            <td style={{ padding:"12px 14px", minWidth:120, maxWidth:180 }}>
                              {c.itMessage ? <span style={{ fontSize:11, color:T.teal, fontStyle:"italic", wordBreak:"break-word", display:"block" }}>{c.itMessage}</span>
                                : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                            </td>
                            <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                              {c.status === "transfer"
                                ? <button className="ops-upd" onClick={() => setUpdateTarget(c)} style={{ padding:"4px 12px", borderRadius:2, background:T.amberBg, border:`1px solid ${T.amber}44`, color:T.amber, fontSize:9, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'Cinzel',serif" }}>UPDATE</button>
                                : <span style={{ fontSize:9, letterSpacing:"0.12em", fontWeight:700, color: c.status==="cancel" ? T.red : T.green, fontFamily:"'Cinzel',serif" }}>{c.status==="cancel" ? "CANCELLED" : "CLOSED"}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div style={{ padding:"9px 18px", borderTop:`1px solid ${T.subtle}22`, display:"flex", justifyContent:"space-between", background:`${T.bg}aa` }}>
                  <span style={{ fontSize:9, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{filtered.length} of {campaigns.length} campaigns</span>
                  <span style={{ fontSize:9, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>LIVE UPDATES ACTIVE</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CREATE ──────────────────────────────────────────────────── */}
        {activeSection === "create" && (
          <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>
            <div style={{ maxWidth:560 }}>
              <div style={{ padding:"11px 16px", marginBottom:20, border:`1px solid ${teamId ? T.goldBorder : `${T.red}44`}`, borderRadius:4, background:T.bgCard, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background: teamId ? T.green : T.red, boxShadow: teamId ? `0 0 6px ${T.green}` : "none" }} />
                <div>
                  <p style={{ margin:0, fontSize:9, color:T.muted, letterSpacing:"0.14em", fontFamily:"'Cinzel',serif" }}>{teamId ? "TEAM RESOLVED" : "TEAM NOT FOUND"}</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color: teamId ? T.gold : T.red, fontFamily:"'JetBrains Mono',monospace" }}>{teamId ? `${teamId.slice(0,24)}…` : "Please wait or refresh the page"}</p>
                </div>
              </div>

              <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, padding: isMobile ? "22px 18px" : "28px 26px 24px", animation:"opsFadeUp .28s .05s ease both" }}>
                <p style={{ margin:0, fontSize:8, letterSpacing:"0.22em", color:T.gold, fontFamily:"'Cinzel',serif" }}>— NEW REQUEST</p>
                <h2 style={{ margin:"4px 0 22px", fontSize:15, fontWeight:600, color:T.white, fontFamily:"'Cinzel',serif", letterSpacing:"0.08em" }}>Create Campaign</h2>

                {createError && <div style={{ padding:"10px 14px", borderRadius:3, marginBottom:18, background:T.redBg, border:`1px solid ${T.red}44`, color:T.red, fontSize:12 }}>{createError}</div>}
                {createOk    && <div style={{ padding:"10px 14px", borderRadius:3, marginBottom:18, background:T.greenBg, border:`1px solid ${T.green}44`, color:T.green, fontSize:11, fontFamily:"'Cinzel',serif", letterSpacing:"0.08em" }}>✓ CAMPAIGN CREATED — Redirecting…</div>}

                <form onSubmit={handleCreate}>
                  <Field label="MESSAGE" hint="required">
                    <textarea className="ops-focus" value={createForm.message}
                      onChange={e => setCreateForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Describe the campaign request in detail…" rows={4} required
                      style={{ ...inputSx, resize:"vertical", lineHeight:1.6 }} />
                  </Field>
                  <Field label="REQUESTED DATE / TIME" hint="optional — defaults to now">
                    <input type="datetime-local" className="ops-focus" value={createForm.requestedAt}
                      onChange={e => setCreateForm(f => ({ ...f, requestedAt: e.target.value }))}
                      style={{ ...inputSx, colorScheme:"dark" }} />
                  </Field>
                  <div style={{ borderTop:`1px solid ${T.subtle}`, paddingTop:20, marginTop:6 }}>
                    <GoldBtn type="submit" disabled={creating || !teamId} style={{ width:"100%", padding:"13px" }}>
                      {creating ? "CREATING…" : !teamId ? "LOADING TEAM…" : "CREATE CAMPAIGN"}
                    </GoldBtn>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── TEAM MEMBERS ────────────────────────────────────────────── */}
        {activeSection === "team" && (
          <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:24, alignItems:"start" }}>
              <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, padding:"24px 22px", animation:"opsFadeUp .22s ease" }}>
                <p style={{ margin:"0 0 4px", fontSize:8, letterSpacing:"0.22em", color:T.gold, fontFamily:"'Cinzel',serif" }}>— ADD MEMBER</p>
                <h2 style={{ margin:"0 0 20px", fontSize:15, fontWeight:600, color:T.white, fontFamily:"'Cinzel',serif" }}>Add PPC Member</h2>

                {userError && <div style={{ padding:"10px 14px", borderRadius:3, marginBottom:16, background:T.redBg, border:`1px solid ${T.red}44`, color:T.red, fontSize:12 }}>{userError}</div>}
                {userOk    && <div style={{ padding:"10px 14px", borderRadius:3, marginBottom:16, background:T.greenBg, border:`1px solid ${T.green}44`, color:T.green, fontSize:11, fontFamily:"'Cinzel',serif", letterSpacing:"0.08em" }}>✓ PPC MEMBER ADDED</div>}

                <form onSubmit={handleCreateUser}>
                  <Field label="USERNAME" hint="required"><input className="ops-focus" type="text" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. john_doe" required style={inputSx} /></Field>
                  <Field label="EMAIL" hint="@satkartar.com or @skinrange.com"><input className="ops-focus" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@satkartar.com" required style={inputSx} /></Field>
                  <Field label="PASSWORD" hint="required"><input className="ops-focus" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••••" required style={inputSx} /></Field>
                  <div style={{ borderTop:`1px solid ${T.subtle}`, paddingTop:18, marginTop:2 }}>
                    <GoldBtn type="submit" disabled={creatingUser} style={{ width:"100%", padding:"12px" }}>{creatingUser ? "ADDING…" : "ADD PPC MEMBER"}</GoldBtn>
                  </div>
                </form>
              </div>

              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <p style={{ margin:0, fontSize:8, color:T.muted, letterSpacing:"0.2em", fontFamily:"'Cinzel',serif" }}>TEAM MEMBERS ·</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ padding:"2px 9px", borderRadius:2, background:T.goldDim, border:`1px solid ${T.goldBorder}`, fontSize:9, color:T.gold, fontFamily:"'JetBrains Mono',monospace" }}>{ppcMembers.length} members</span>
                    <GoldBtn variant="outline" onClick={loadTeamInfo} style={{ padding:"5px 12px", fontSize:9 }}>REFRESH</GoldBtn>
                  </div>
                </div>

                {teamLoading ? (
                  <div style={{ padding:"40px 20px", textAlign:"center", color:T.muted }}>
                    <div style={{ marginBottom:10, color:T.gold, fontSize:22 }}>◈</div>Loading members…
                  </div>
                ) : ppcMembers.length === 0 ? (
                  <div style={{ padding:"40px 20px", textAlign:"center", background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4 }}>
                    <div style={{ fontSize:24, color:T.subtle, marginBottom:12, fontFamily:"'Cinzel',serif" }}>◇</div>
                    <p style={{ margin:0, fontSize:14, color:T.white, fontFamily:"'Cinzel',serif" }}>No PPC Members Yet</p>
                    <p style={{ margin:"6px 0 0", fontSize:13, color:T.muted }}>Add your first PPC member using the form.</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {ppcMembers.map(u => (
                      <UserCard key={u._id} user={u}
                        campaignCount={campaigns.filter(c => {
                          const id = typeof c.createdBy === "object" ? c.createdBy?._id : c.createdBy;
                          return String(id) === String(u._id);
                        }).length}
                        onDelete={target => setDeleteTarget(target)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {updateTarget && <UpdateModal campaign={updateTarget} onClose={() => setUpdateTarget(null)} onSave={handleUpdate} />}
      {deleteTarget  && <DeleteUserModal target={deleteTarget} title="Remove PPC Member" onClose={() => setDeleteTarget(null)} onConfirm={id => handleDeleteUser(id)} />}
    </div>
  );
}
