import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardStats,
  getCalls,
  // getCampaignPerformance,
  // getAgentPerformance,
  // getSystemHealth,
} from "@/lib/api";

// ─────────────────────────── helpers ───────────────────────────
function fmtDuration(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// function sentiment(score: number | null | undefined) {
//   if (score == null) return { label: "—", cls: "text-slate-400" };
//   if (score >= 0.3) return { label: "Positive", cls: "text-emerald-600" };
//   if (score <= -0.3) return { label: "Negative", cls: "text-red-600" };
//   return { label: "Neutral", cls: "text-slate-500" };
// }


function formatDateTime(iso: string): string {
  if (!iso) return "—";

  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart) return iso;

  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${day} ${months[Number(month) - 1]} ${year}, ${hour}:${minute}:${second.slice(0,2)}`;
}

// const HEALTH_COLORS: Record<string, string> = {
//   operational: "bg-emerald-500",
//   configured: "bg-emerald-500",
//   unknown: "bg-slate-300",
//   "not configured": "bg-amber-400",
//   down: "bg-red-500",
// };

// ─────────────────────────── small components ───────────────────────────
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// function HealthCard({ label, state }: { label: string; state: string }) {
//   const dot = HEALTH_COLORS[state] || "bg-slate-300";
//   return (
//     <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
//       <div>
//         <p className="text-sm font-medium text-slate-700">{label}</p>
//         <p className="text-xs capitalize text-slate-400">{state}</p>
//       </div>
//       <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
//     </div>
//   );
// }

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      {right}
    </div>
  );
}

// ─────────────────────────── types ───────────────────────────
interface Stats {
  active_calls: number;
  todays_calls: number;
  answer_rate: number;
  transfer_rate: number;
  avg_duration: number;
}
interface LiveCall {
  uid: string;
  agent_uid: string;
  agent_name: string;
  campaign_uid: string | null;
  campaign_name: string | null;
  is_incoming: boolean;
  created_at: string;
  started_at: string;
  ended_at: string;
  finished: boolean;
  failure_reason: string;
  sentiment: string;
  has_recording: boolean;
}
interface Campaign {
  total: number;
  running: number;
  calls_made: number;
  connected: number;
}
interface AgentPerf {
  uid: string;
  name: string;
  num_calls: number;
  avg_duration: number;
  transfer_fraction: number;
  success_fraction: number;
}
// interface Health {
//   livekit: string;
//   asterisk: string;
//   sip_trunk: string;
//   stt: string;
//   tts: string;
//   llm: string;
// }

// ─────────────────────────── page ───────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState<LiveCall[]>([]);
  const [camp, setCamp] = useState<Campaign | null>(null);
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  // const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const fast = () => {
      const client_uid = localStorage.getItem("active_client_id");

      if (client_uid) {
        getDashboardStats({ client_uid })
        .then((r) => {
          setStats(r.data.operations_overview);
          setCamp(r.data.campaigns_performance);
          setAgents(r.data.agents_performance ?? []);
        })
          .catch(() => {});
      }

      if (client_uid) {
        getCalls({
          client_uid,
          campaign_uid: null,
          agent_uid: null,
          only_without_campaign: false,
        })
          .then((r) =>
            setLive(
              (r.data.calls ?? []).filter(
                (c: LiveCall) => !c.finished
              )
            )
          )
          .catch(() => setLive([]));
      }
    };
    const slow = () => {
      // getSystemHealth().then((r) => setHealth(r.data)).catch(() => setHealth(null));
    };
    fast();
    slow();
    const t1 = setInterval(fast, 5000); // real-time row every 5s
    const t2 = setInterval(slow, 30000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Operations Overview</h2>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
        </span>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Active Calls" value={String(stats?.active_calls ?? 0)} />
        <Kpi label="Today's Calls" value={String(stats?.todays_calls ?? 0)} />
        <Kpi label="Answer Rate" value={`${(stats?.answer_rate ?? 0).toFixed(1)}%`} />
        <Kpi label="Transfer Rate" value={`${stats?.transfer_rate ?? 0}%`} />
        <Kpi label="Avg Duration" value={fmtDuration(stats?.avg_duration)}/>
      </div>

      {/* SYSTEM HEALTH */}
      {/* <div>
        <SectionTitle>System Health</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <HealthCard label="LiveKit" state={health?.livekit ?? "unknown"} />
          <HealthCard label="Asterisk / SIP" state={health?.asterisk ?? "unknown"} />
          <HealthCard label="SIP Trunk" state={health?.sip_trunk ?? "unknown"} />
          <HealthCard label="STT (Deepgram)" state={health?.stt ?? "unknown"} />
          <HealthCard label="TTS (Cartesia)" state={health?.tts ?? "unknown"} />
          <HealthCard label="LLM" state={health?.llm ?? "unknown"} />
        </div>
      </div> */}

      {/* REAL-TIME CALL ACTIVITY */}
      <div>
        <SectionTitle right={<Link to="/live-calls" className="text-xs text-brand-600 hover:underline">View all</Link>}>
          Real-Time Call Activity
        </SectionTitle>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            {/* <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Agent / Bot</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">State</th>
                <th className="px-4 py-2.5 font-medium">Sentiment</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead> */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Call ID</th>
                <th className="px-4 py-2.5">Started</th>
                <th className="px-4 py-2.5">Campaign</th>
                <th className="px-4 py-2.5">Agent</th>
                <th className="px-4 py-2.5">Direction</th>
                {/* <th className="px-4 py-2.5 text-right">Action</th> */}
              </tr>
            </thead>
            {/* <tbody>
              {live.map((c) => {
                const s = sentiment(c.sentiment_score);
                const active = c.status === "active";
                return (
                  <tr key={c.call_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-slate-700">{c.caller_number || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.agent_name}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{fmtDuration(c.duration_seconds)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-amber-400"}`} />
                        <span className="capitalize text-slate-600">{c.status}</span>
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 ${s.cls}`}>{s.label}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to="/live-calls" className="text-xs text-brand-600 hover:underline">Monitor</Link>
                    </td>
                  </tr>
                );
              })}
              {live.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No active calls right now
                  </td>
                </tr>
              )}
            </tbody> */}
            <tbody>
              {live.map((call) => (
                <tr
                  key={call.uid}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2.5 font-mono">
                    {call.uid.slice(0, 8)}
                  </td>

                  <td className="px-4 py-2.5 text-xs">
                    {formatDateTime(call.created_at)}
                  </td>

                  <td className="px-4 py-2.5">
                    {call.campaign_name ?? "-"}
                  </td>

                  <td className="px-4 py-2.5">
                    {call.agent_name}
                  </td>

                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        call.is_incoming
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {call.is_incoming ? "↓ In" : "↑ Out"}
                    </span>
                  </td>

                  {/* <td className="px-4 py-2.5 text-right">
                    <Link
                      to="/live-calls"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Monitor
                    </Link>
                  </td> */}
                </tr>
              ))}

              {live.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No active calls right now
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAMPAIGN PERFORMANCE */}
      <div>
        <SectionTitle right={<Link to="/campaigns" className="text-xs text-brand-600 hover:underline">Manage</Link>}>
          Campaign Performance
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total Campaigns" value={camp?.total ?? 0} />
          <StatCard label="Running" value={camp?.running ?? 0} />
          <StatCard label="Calls Made" value={camp?.calls_made ?? 0} />
          <StatCard label="Connected" value={camp?.connected ?? 0} />
        </div>
      </div>

      {/* AI AGENT PERFORMANCE */}
      <div>
        <SectionTitle right={<Link to="/agents" className="text-xs text-brand-600 hover:underline">Manage agents</Link>}>
          AI Agent Performance
        </SectionTitle>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-medium">Agent</th>
                <th className="px-4 py-2.5 font-medium text-right">Calls</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg Duration</th>
                <th className="px-4 py-2.5 font-medium text-right">Transfer %</th>
                <th className="px-4 py-2.5 font-medium text-right">Success %</th>
                {/* <th className="px-4 py-2.5 font-medium text-right">Cost / Call</th> */}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr
                  key={a.uid}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {a.name}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {a.num_calls}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {fmtDuration(a.avg_duration)}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {(a.transfer_fraction * 100).toFixed(1)}%
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                    {(a.success_fraction * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}

              {agents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No agent activity available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
