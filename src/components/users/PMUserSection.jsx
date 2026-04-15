/**
 * PMUserSection — displays all users in three role tabs.
 *
 * FIX: Previously showed nothing because GET /user/list didn't exist.
 * Now it works via the new endpoint and displays:
 *   • Managers — name, email, their PPC members listed below
 *   • PPCs     — name, email, manager's name
 *   • IT       — name, email
 *
 * @prop {object[]} users       — all users from GET /user/list
 * @prop {boolean}  loading
 * @prop {Function} onDelete    — called with user object when DELETE is clicked
 * @prop {Function} onRefresh
 */
import { useState, useMemo } from "react";
import { T }        from "../../constants/theme.js";
import { initials } from "../../utils/formatters.js";
import RoleBadge    from "../common/RoleBadge.jsx";
import GoldBtn      from "../common/GoldBtn.jsx";

/* ── Colour per role (consistent with existing design) ──────────────────────── */
const ROLE_COLORS = {
  manager:          { color: T.gold,   bg: T.goldDim  },
  ppc:              { color: T.blue,   bg: T.blueBg   },
  it:               { color: T.teal,   bg: T.tealBg   },
  "process manager":{ color: T.purple, bg: T.purpleBg },
};

/* ── Tab configuration ──────────────────────────────────────────────────────── */
const TABS = [
  { id: "managers", label: "Managers",  role: "manager" },
  { id: "ppcs",     label: "PPCs",      role: "ppc"     },
  { id: "it",       label: "IT",        role: "it"      },
];

/* ── UserCard ────────────────────────────────────────────────────────────────── */
function UserCard({ user, extra = null, onDelete }) {
  const rc = ROLE_COLORS[user.role] ?? { color: T.muted, bg: "rgba(122,112,96,0.1)" };

  return (
    <div
      style={{
        background:  T.bgCard,
        border:      `1px solid ${T.goldBorder}`,
        borderRadius: 6,
        padding:     "16px 18px",
        transition:  "border-color .2s, box-shadow .2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${rc.color}55`;
        e.currentTarget.style.boxShadow   = "0 4px 16px rgba(0,0,0,.4)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.goldBorder;
        e.currentTarget.style.boxShadow   = "none";
      }}
    >
      {/* Top row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom: extra ? 12 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:"50%", flexShrink:0,
            background:rc.bg, border:`1px solid ${rc.color}44`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:12, fontWeight:700, color:rc.color, fontFamily:"'Cinzel',serif",
          }}>
            {initials(user.username)}
          </div>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:T.white, fontFamily:"'Cinzel',serif" }}>
              {user.username}
            </p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>
              {user.email}
            </p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <RoleBadge role={user.role} />
          {onDelete && (
            <button className="ops-del"
              onClick={() => onDelete(user)}
              style={{ padding:"3px 10px", borderRadius:2, background:T.redBg, border:`1px solid ${T.red}33`, color:T.muted, fontSize:9, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'Cinzel',serif" }}>
              DELETE
            </button>
          )}
        </div>
      </div>

      {/* Extra info slot */}
      {extra}
    </div>
  );
}

/* ── ManagerCard — shows manager info + their PPCs ──────────────────────────── */
function ManagerCard({ manager, ppcs, onDelete }) {
  const teamPpcs = ppcs.filter(p => {
    const mid = typeof p.managerId === "object" ? p.managerId?._id : p.managerId;
    return String(mid) === String(manager._id);
  });

  const extra = teamPpcs.length > 0 ? (
    <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${T.subtle}22` }}>
      <p style={{ margin:"0 0 6px", fontSize:8, letterSpacing:"0.14em", color:T.muted, fontFamily:"'Cinzel',serif" }}>
        TEAM MEMBERS ({teamPpcs.length})
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {teamPpcs.map(p => (
          <div key={p._id} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:T.blue, flexShrink:0 }} />
            <span style={{ fontSize:11, color:T.text }}>{p.username}</span>
            <span style={{ fontSize:10, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{p.email}</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${T.subtle}22` }}>
      <p style={{ margin:0, fontSize:11, color:T.subtle, fontStyle:"italic" }}>No PPC members assigned yet</p>
    </div>
  );

  return <UserCard user={manager} extra={extra} onDelete={onDelete} />;
}

/* ── PPCCard — shows PPC info + manager name ────────────────────────────────── */
function PPCCard({ ppc, onDelete }) {
  const managerName = typeof ppc.managerId === "object"
    ? ppc.managerId?.username
    : null;

  const extra = (
    <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${T.subtle}22` }}>
      <span style={{ fontSize:9, color:T.muted, letterSpacing:"0.1em", fontFamily:"'Cinzel',serif" }}>MANAGER — </span>
      <span style={{ fontSize:11, color: managerName ? T.gold : T.muted }}>
        {managerName || "Not assigned"}
      </span>
    </div>
  );

  return <UserCard user={ppc} extra={extra} onDelete={onDelete} />;
}

/* ── Main export ─────────────────────────────────────────────────────────────── */
export default function PMUserSection({ users, loading, onDelete, onRefresh }) {
  const [activeTab, setActiveTab] = useState("managers");

  const managers = useMemo(() => users.filter(u => u.role === "manager"),          [users]);
  const ppcs     = useMemo(() => users.filter(u => u.role === "ppc"),              [users]);
  const its      = useMemo(() => users.filter(u => u.role === "it"),               [users]);

  const countMap = { managers: managers.length, ppcs: ppcs.length, it: its.length };

  return (
    <div>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", gap:8 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const rc     = ROLE_COLORS[tab.role] ?? {};
            return (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 14px", borderRadius:3,
                  background: active ? (rc.bg || T.goldDim) : "transparent",
                  border:`1px solid ${active ? (rc.color || T.gold) : T.subtle}`,
                  color: active ? (rc.color || T.gold) : T.muted,
                  fontSize:11, fontWeight: active ? 600 : 400,
                  cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                  transition:"all .15s",
                }}>
                {tab.label}
                <span style={{ padding:"1px 6px", borderRadius:99, background: active ? (rc.color || T.gold) : T.subtle, color: active ? "#0c0b08" : T.muted, fontSize:9, fontFamily:"'JetBrains Mono',monospace" }}>
                  {countMap[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
        <GoldBtn variant="outline" onClick={onRefresh} style={{ padding:"6px 14px", fontSize:9 }}>
          REFRESH
        </GoldBtn>
      </div>

      {loading ? (
        <div style={{ padding:"52px 20px", textAlign:"center", color:T.muted }}>
          <div style={{ marginBottom:10, color:T.gold, fontSize:22 }}>◈</div>Loading users…
        </div>
      ) : (
        <>
          {/* Managers */}
          {activeTab === "managers" && (
            managers.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center", background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4 }}>
                <p style={{ margin:0, fontSize:14, color:T.white, fontFamily:"'Cinzel',serif" }}>No Managers Found</p>
                <p style={{ margin:"6px 0 0", fontSize:13, color:T.muted }}>Create a manager from the Manage Users section.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:14 }}>
                {managers.map(m => (
                  <ManagerCard key={m._id} manager={m} ppcs={ppcs} onDelete={onDelete} />
                ))}
              </div>
            )
          )}

          {/* PPCs */}
          {activeTab === "ppcs" && (
            ppcs.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center", background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4 }}>
                <p style={{ margin:0, fontSize:14, color:T.white, fontFamily:"'Cinzel',serif" }}>No PPC Users Found</p>
                <p style={{ margin:"6px 0 0", fontSize:13, color:T.muted }}>Managers can create PPC users from their dashboard.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
                {ppcs.map(p => (
                  <PPCCard key={p._id} ppc={p} onDelete={onDelete} />
                ))}
              </div>
            )
          )}

          {/* IT */}
          {activeTab === "it" && (
            its.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center", background:T.bgCard, border:`1px solid ${T.goldBorder}`, borderRadius:4 }}>
                <p style={{ margin:0, fontSize:14, color:T.white, fontFamily:"'Cinzel',serif" }}>No IT Users Found</p>
                <p style={{ margin:"6px 0 0", fontSize:13, color:T.muted }}>Create an IT user from the Manage Users section.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
                {its.map(u => (
                  <UserCard key={u._id} user={u} onDelete={onDelete} />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}