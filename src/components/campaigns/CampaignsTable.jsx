/**
 * CampaignsTable — PM's filterable, searchable full-org campaign table.
 * Extracted from PMDashboard where it was defined as a 170-line local component.
 * Used in three sections of PMDashboard: "campaigns", "open-requests", "closed-requests".
 *
 * @prop {object[]}  campaigns     - list of campaign documents
 * @prop {boolean}   loading       - show loading state
 * @prop {Function}  onAction      - called with campaign when UPDATE is clicked
 * @prop {boolean}   isMobile
 * @prop {string=}   title         - table header label
 * @prop {boolean=}  showActionBtn - whether UPDATE button is shown (default true)
 */
import { useState, useMemo } from "react";
import { T, inputSx } from "../../constants/theme.js";
import { PM_FILTER_CARDS } from "../../constants/filterCards.js";
import { STATUS_META, ACTION_META } from "../../constants/statusMeta.js";
import StatusBadge from "../common/StatusBadge.jsx";
import { fmt } from "../../utils/formatters.js";

export default function CampaignsTable({
  campaigns,
  loading,
  onAction,
  isMobile,
  title = "ALL CAMPAIGNS",
  showActionBtn = true,
}) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  const stats = useMemo(() => ({
    transfer: campaigns.filter(c => c.status === "transfer").length,
    approve:  campaigns.filter(c => c.action === "approve").length,
    done:     campaigns.filter(c => c.status === "done").length,
    cancel:   campaigns.filter(c => c.status === "cancel" || c.action === "cancel").length,
  }), [campaigns]);

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (statusFilter) {
      list = statusFilter === "approve"
        ? list.filter(c => c.action === "approve")
        : statusFilter === "cancel"
        ? list.filter(c => c.status === "cancel" || c.action === "cancel")
        : list.filter(c => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.message?.toLowerCase().includes(q) ||
        fmt(c.createdAt).includes(q) ||
        fmt(c.requestedAt).includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [campaigns, statusFilter, search]);

  const COLS = ["TIMESTAMP","PPC MESSAGE","PM COMMENT","STATUS","PM ACTION","REQUESTED TIME","SCHEDULE AT","IT COMMENT","TICKET STATE"];

  return (
    <div>
      {/* Filter cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {PM_FILTER_CARDS.map(card => {
          const active = statusFilter === card.id;
          return (
            <div
              key={card.id}
              className="ops-fcard"
              onClick={() => setStatusFilter(p => p === card.id ? null : card.id)}
              style={{
                flex: isMobile ? "0 0 130px" : "1 1 0",
                minWidth: 110,
                padding: "14px 16px 12px",
                borderRadius: 4,
                background: active ? card.bg : T.bgCard,
                border: `1px solid ${active ? card.color : T.goldBorder}`,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: card.color, flexShrink: 0 }} />
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
                  color: active ? card.color : T.muted, fontFamily: "'Cinzel', serif",
                }}>
                  {card.label.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: active ? card.color : T.white, fontFamily: "'Cinzel', serif", lineHeight: 1 }}>
                {stats[card.id] ?? 0}
              </div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 4 }}>campaigns</div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.goldBorder}`,
        borderRadius: 4, overflow: "hidden",
        animation: "opsFadeUp .28s .05s ease both",
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "12px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexWrap: "wrap",
          borderBottom: `1px solid ${T.subtle}`,
          background: `${T.bg}cc`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", color: T.gold, fontFamily: "'Cinzel', serif" }}>
              {title}
            </span>
            <span style={{
              padding: "2px 9px", borderRadius: 2,
              background: T.goldDim, border: `1px solid ${T.goldBorder}`,
              fontSize: 9, color: T.gold, fontFamily: "'JetBrains Mono', monospace",
            }}>
              {filtered.length} records
            </span>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                style={{
                  background: "transparent", border: `1px solid ${T.subtle}`,
                  color: T.muted, fontSize: 9, cursor: "pointer",
                  padding: "2px 8px", borderRadius: 2, transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.subtle; }}
              >
                ✕ Clear filter
              </button>
            )}
          </div>
          <div style={{ position: "relative", flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 13, pointerEvents: "none" }}>⌕</span>
            <input
              className="ops-focus"
              type="text"
              placeholder="Search message, date, time…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputSx, paddingLeft: 32, height: 34, width: isMobile ? "100%" : 240, fontSize: 12, borderRadius: 3 }}
            />
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div style={{ padding: "52px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
            <div style={{ marginBottom: 10, color: T.gold, fontSize: 22 }}>◈</div>Loading campaigns…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, color: T.subtle, marginBottom: 12, fontFamily: "'Cinzel', serif" }}>◇</div>
            <p style={{ margin: 0, fontSize: 14, color: T.white, fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}>No Records Found</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: T.muted }}>Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.subtle}`, background: `${T.bg}dd` }}>
                  {COLS.map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontSize: 9, fontWeight: 600, color: T.gold,
                      letterSpacing: "0.14em", fontFamily: "'Cinzel', serif",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const isClosed = c.status === "cancel" || c.action === "cancel" || c.status === "done" || c.acknowledgement;
                  const canAct   = !isClosed && showActionBtn;

                  return (
                    <tr
                      key={c._id}
                      className="ops-row"
                      style={{
                        borderBottom: `1px solid ${T.subtle}22`,
                        background: i % 2 === 1 ? `${T.bgCard}88` : "transparent",
                      }}
                    >
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        <span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.createdAt)}</span>
                      </td>
                      <td style={{ padding:"12px 14px", minWidth:160, maxWidth:240 }}>
                        <p style={{ margin:0, fontSize:12, color:T.text, lineHeight:1.55, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{c.message}</p>
                      </td>
                      <td style={{ padding:"12px 14px", minWidth:140, maxWidth:220 }}>
                        {c.pmMessage
                          ? <p style={{ margin:0, fontSize:12, color:T.muted, lineHeight:1.55, fontStyle:"italic", wordBreak:"break-word" }}>{c.pmMessage}</p>
                          : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        <StatusBadge value={c.status} meta={STATUS_META} />
                      </td>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        {c.action
                          ? <StatusBadge value={c.action} meta={ACTION_META} />
                          : <span className="ops-pending" style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:2, background:"rgba(122,112,96,0.11)", color:T.muted, fontSize:9, fontWeight:700, letterSpacing:"0.12em", fontFamily:"'Cinzel',serif", border:`1px solid ${T.muted}33` }}>PENDING</span>}
                      </td>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        <span style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.requestedAt)}</span>
                      </td>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        {c.scheduleAt
                          ? <span style={{ fontSize:11, color:T.purple, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(c.scheduleAt)}</span>
                          : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 14px", minWidth:130, maxWidth:200 }}>
                        {c.itMessage
                          ? <span style={{ fontSize:11, color:T.teal, fontStyle:"italic", wordBreak:"break-word", display:"block" }}>{c.itMessage}</span>
                          : <span style={{ fontSize:11, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>—</span>}
                      </td>
                      <td style={{ padding:"12px 14px", whiteSpace:"nowrap" }}>
                        {canAct ? (
                          <button
                            className="ops-upd"
                            onClick={() => onAction(c)}
                            style={{
                              padding:"4px 12px", borderRadius:2,
                              background:T.amberBg, border:`1px solid ${T.amber}44`,
                              color:T.amber, fontSize:9, fontWeight:700,
                              letterSpacing:"0.12em", cursor:"pointer",
                              fontFamily:"'Cinzel',serif",
                            }}
                          >UPDATE</button>
                        ) : (
                          <span style={{
                            fontSize:9, letterSpacing:"0.12em", fontWeight:700,
                            color:(c.status==="cancel"||c.action==="cancel") ? T.red : T.green,
                            fontFamily:"'Cinzel',serif",
                          }}>
                            {(c.status==="cancel"||c.action==="cancel") ? "CANCELLED" : "CLOSED"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{
            padding: "9px 18px", borderTop: `1px solid ${T.subtle}22`,
            display: "flex", justifyContent: "space-between",
            background: `${T.bg}aa`,
          }}>
            <span style={{ fontSize:9, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>
              {filtered.length} of {campaigns.length} campaigns
            </span>
            <span style={{ fontSize:9, color:T.subtle, fontFamily:"'JetBrains Mono',monospace" }}>
              LIVE UPDATES ACTIVE
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
