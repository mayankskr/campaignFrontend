/**
 * PPCDashboard — final refactored version.
 *
 * CHANGES from previous pass:
 *  - handleLogout             → useLogout() hook
 *  - socket + setState calls  → useCampaigns({ onNotification })
 *  - Filter cards grid        → <FilterCardsGrid>
 *  - Table toolbar            → <TableToolbar>
 *  - "No Records Found"       → <EmptyState>
 *  - "PENDING" inline badge   → <PendingBadge>
 */
import { useEffect, useState, useCallback, useMemo } from "react";

import useAuthStore  from "../stores/useAuthStore.js";
import useNotifStore from "../stores/useNotificationStore.js";

import { useResponsive }           from "../hooks/useResponsive.js";
import { useCampaigns }            from "../hooks/useCampaigns.js";
import { useLogout }               from "../hooks/useLogout.js";
import { T, inputSx }             from "../constants/theme.js";
import { STATUS_META, ACTION_META } from "../constants/statusMeta.js";
import { FILTER_CARDS }            from "../constants/filterCards.js";
import { fmt }                     from "../utils/formatters.js";

import OpsGlobalStyles  from "../components/common/OpsGlobalStyles.jsx";
import StatusBadge      from "../components/common/StatusBadge.jsx";
import PendingBadge     from "../components/common/PendingBadge.jsx";
import EmptyState       from "../components/common/EmptyState.jsx";
import GoldBtn          from "../components/common/GoldBtn.jsx";
import Field            from "../components/common/Field.jsx";
import DashboardSidebar from "../components/layout/DashboardSidebar.jsx";
import DashboardHeader  from "../components/layout/DashboardHeader.jsx";
import FilterCardsGrid  from "../components/campaigns/FilterCardsGrid.jsx";
import TableToolbar     from "../components/campaigns/TableToolbar.jsx";
import UpdateModal      from "../components/campaigns/UpdateModal.jsx";

export default function PPCDashboard() {
  const user            = useAuthStore(s => s.user);
  const addNotification = useNotifStore(s => s.addNotification);
  const handleLogout    = useLogout();
  const isMobile        = useResponsive();

  const { campaigns, getCampaign, createCampaign, updateCampaign } = useCampaigns({
    onNotification: addNotification,
  });

  const [loading,       setLoading]       = useState(true);
  const [pageError,     setPageError]     = useState("");
  const [activeSection, setActiveSection] = useState("campaigns");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [statusFilter,  setStatusFilter]  = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [updateTarget,  setUpdateTarget]  = useState(null);
  const [createForm,    setCreateForm]    = useState({ message: "", requestedAt: "" });
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [createOk,      setCreateOk]      = useState(false);
  const [teamId,        setTeamId]        = useState(() => localStorage.getItem("ops_ppc_team_id") || "");
  const [teamIdInput,   setTeamIdInput]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getCampaign();
        if (!teamId && Array.isArray(data) && data.length > 0) {
          const rawId = data[0].teamId;
          const tid   = typeof rawId === "object" ? (rawId?._id || String(rawId)) : rawId;
          if (tid) { setTeamId(tid); localStorage.setItem("ops_ppc_team_id", tid); }
        }
      } catch { setPageError("Failed to load campaigns. Please refresh."); }
      finally   { setLoading(false); }
    })();
  }, [getCampaign]); // eslint-disable-line

  const stats = useMemo(() => ({
    transfer:   campaigns.filter(c => c.status === "transfer").length,
    approve:    campaigns.filter(c => c.action === "approve").length,
    done:       campaigns.filter(c => c.status === "done").length,
    cancel:     campaigns.filter(c => c.status === "cancel").length,
    "not done": campaigns.filter(c => c.status === "not done").length,
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
    setActiveSection(section);
    setSidebarOpen(false);
    setCreateError(""); setCreateOk(false);
  };

  const handleFilterSelect = useCallback(id => {
    setStatusFilter(p => p === id ? null : id);
    if (isMobile) setFiltersOpen(false);
  }, [isMobile]);

  const handleCreate = useCallback(async e => {
    e.preventDefault();
    setCreateError(""); setCreateOk(false);
    if (!teamId.trim())             { setCreateError("Team ID is required."); return; }
    if (!createForm.message.trim()) { setCreateError("Campaign message is required."); return; }
    setCreating(true);
    try {
      await createCampaign({
        message:     createForm.message.trim(),
        requestedAt: createForm.requestedAt || undefined,
        teamId:      teamId.trim(),
      });
      setCreateForm({ message: "", requestedAt: "" });
      setCreateOk(true);
      addNotification("Campaign created successfully");
      setTimeout(() => { setActiveSection("campaigns"); setCreateOk(false); }, 1800);
    } catch (err) { setCreateError(err?.response?.data?.message || "Failed to create campaign."); }
    finally       { setCreating(false); }
  }, [teamId, createForm, createCampaign, addNotification]);

  const handleUpdate = useCallback(async (id, data) => {
    await updateCampaign(id, data);
    addNotification(data.status === "cancel" ? "Campaign cancelled" : "Campaign updated");
  }, [updateCampaign, addNotification]);

  const saveTeamId = () => {
    const tid = teamIdInput.trim();
    if (!tid) return;
    setTeamId(tid); localStorage.setItem("ops_ppc_team_id", tid);
    setTeamIdInput(""); setCreateError("");
  };

  const NAV = [
    { id: "campaigns", label: "My Campaigns"    },
    { id: "create",    label: "Create Campaign" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans',sans-serif" }}>
      <OpsGlobalStyles />

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:7999, background:"rgba(0,0,0,0.72)" }} />
      )}

      <DashboardSidebar brandSub="PPC PANEL" navItems={NAV} activeSection={activeSection}
        onNavigate={goTo} user={user} role="ppc" onLogout={handleLogout}
        isMobile={isMobile} open={sidebarOpen} />

      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <DashboardHeader isMobile={isMobile} onMenuToggle={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
          title={activeSection === "create" ? "Create Campaign" : "My Campaigns"}
          subLabel="— ADMIN PANEL" />

        {pageError && (
          <div style={{ margin:"16px 28px 0", padding:"10px 14px", background:T.redBg, border:`1px solid ${T.red}44`, borderRadius:3, color:T.red, fontSize:12 }}>{pageError}</div>
        )}

        {activeSection === "campaigns" && (
          <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>

            {/* Mobile toggle */}
            {isMobile && (
              <button onClick={() => setFiltersOpen(v => !v)}
                style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom: filtersOpen ? 12 : 20, padding:"7px 13px", borderRadius:3, cursor:"pointer", background: filtersOpen ? T.goldDim : "transparent", border:`1px solid ${filtersOpen ? T.gold : T.subtle}`, color: filtersOpen ? T.gold : T.muted, fontSize:9, letterSpacing:"0.16em", fontFamily:"'Cinzel',serif", transition:"all .15s" }}>
                ◈ {statusFilter ? FILTER_CARDS.find(f => f.id === statusFilter)?.label.toUpperCase() : "FILTER BY STATUS"} {filtersOpen ? "▲" : "▼"}
              </button>
            )}

            <FilterCardsGrid cards={FILTER_CARDS} stats={stats} activeId={statusFilter}
              onSelect={handleFilterSelect} isMobile={isMobile}
              visible={!isMobile || filtersOpen} />

            <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, overflow:"hidden", animation:"opsFadeUp .28s .05s ease both" }}>
              <TableToolbar title="PROCESS MANAGER VIEW" count={filtered.length}
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
                  sub={searchQuery || statusFilter ? "Try adjusting your search or filter." : "Create your first campaign to get started."}
                  action={!searchQuery && !statusFilter ? <GoldBtn onClick={() => goTo("create")} variant="outline">CREATE CAMPAIGN</GoldBtn> : null}
                />
              ) : (
                <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:860 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${T.subtle}`, background:`${T.bg}dd` }}>
                        {["TIMESTAMP","PPC MESSAGE","PM COMMENT","STATUS","PM ACTION","REQUESTED TIME","IT COMMENT","TICKET STATE"].map(h => (
                          <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:9, fontWeight:600, color:T.gold, letterSpacing:"0.16em", fontFamily:"'Cinzel',serif", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c._id} className="ops-row"
                          style={{ borderBottom:`1px solid ${T.subtle}22`, background: i%2===1 ? `${T.bgCard}88` : "transparent" }}>
                          <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}><span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.createdAt)}</span></td>
                          <td style={{ padding:"12px 16px", minWidth:180, maxWidth:260 }}><p style={{ margin:0, fontSize:12, color:T.text, lineHeight:1.55, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{c.message}</p></td>
                          <td style={{ padding:"12px 16px", minWidth:160, maxWidth:240 }}>
                            {c.pmMessage ? <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.55, fontStyle:"italic", wordBreak:"break-word" }}>{c.pmMessage}</p>
                              : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                          </td>
                          <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}><StatusBadge value={c.status} meta={STATUS_META} /></td>
                          <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                            {c.action ? <StatusBadge value={c.action} meta={ACTION_META} /> : <PendingBadge />}
                          </td>
                          <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}><span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.requestedAt)}</span></td>
                          <td style={{ padding:"12px 16px", minWidth:140, maxWidth:220 }}>
                            {c.itMessage ? <span style={{ fontSize:11, color:T.teal, fontStyle:"italic", wordBreak:"break-word", display:"block" }}>{c.itMessage}</span>
                              : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                          </td>
                          <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                            {c.status === "transfer"
                              ? <button className="ops-upd" onClick={() => setUpdateTarget(c)} style={{ padding:"4px 12px", borderRadius:2, background:T.amberBg, border:`1px solid ${T.amber}44`, color:T.amber, fontSize:9, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'Cinzel',serif" }}>UPDATE</button>
                              : <span style={{ fontSize:9, letterSpacing:"0.12em", fontWeight:700, color: c.status==="cancel" ? T.red : T.green, fontFamily:"'Cinzel',serif" }}>{c.status==="cancel" ? "CANCELLED" : "CLOSED"}</span>}
                          </td>
                        </tr>
                      ))}
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

        {activeSection === "create" && (
          <div style={{ padding: isMobile ? "16px 14px" : "22px 28px", flex:1 }}>
            <div style={{ maxWidth:560 }}>
              <div style={{ padding:"14px 18px", marginBottom:22, border:`1px solid ${T.goldBorder}`, borderRadius:4, background:T.bgCard }}>
                <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                  Fill in the details below to submit a new campaign request.
                  The Process Manager will review and take action after submission.
                </p>
              </div>
              <div style={{ background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4, padding: isMobile ? "22px 18px" : "28px 26px 24px", animation:"opsFadeUp .28s .05s ease both" }}>
                <h2 style={{ margin:"0 0 22px", fontSize:15, fontWeight:600, color:T.white, fontFamily:"'Cinzel',serif", letterSpacing:"0.08em" }}>Create Campaign</h2>

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

                  {!teamId && (
                    <Field label="TEAM ID" hint="required — ask your manager">
                      <div style={{ display:"flex", gap:8 }}>
                        <input className="ops-focus" value={teamIdInput} onChange={e => setTeamIdInput(e.target.value)} placeholder="e.g. 6647b3f2a4c…" style={{ ...inputSx, flex:1 }} />
                        <button type="button" onClick={saveTeamId} style={{ padding:"0 16px", borderRadius:3, whiteSpace:"nowrap", background:T.goldDim, border:`1px solid ${T.goldBorder}`, color:T.gold, fontSize:10, cursor:"pointer", fontFamily:"'Cinzel',serif", letterSpacing:"0.1em", transition:"all .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,164,42,.22)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = T.goldDim; }}>SAVE</button>
                      </div>
                    </Field>
                  )}

                  {teamId && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:T.bgInput, border:`1px solid ${T.subtle}`, borderRadius:3, marginBottom:20 }}>
                      <span style={{ fontSize:9, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>TEAM — {teamId.slice(0,16)}…</span>
                      <button type="button" onClick={() => { setTeamId(""); localStorage.removeItem("ops_ppc_team_id"); }}
                        style={{ background:"none", border:"none", color:T.muted, fontSize:10, cursor:"pointer", transition:"color .15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = T.red}
                        onMouseLeave={e => e.currentTarget.style.color = T.muted}>Change</button>
                    </div>
                  )}

                  <div style={{ borderTop:`1px solid ${T.subtle}`, paddingTop:20, marginTop:6 }}>
                    <GoldBtn type="submit" disabled={creating} style={{ width:"100%", padding:"13px" }}>
                      {creating ? "CREATING…" : "CREATE CAMPAIGN"}
                    </GoldBtn>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {updateTarget && (
        <UpdateModal campaign={updateTarget} onClose={() => setUpdateTarget(null)} onSave={handleUpdate} />
      )}
    </div>
  );
}
