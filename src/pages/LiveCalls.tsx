import { useEffect, useState, useRef } from "react";
// import { io } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
// import { Badge } from "@/components/ui/Badge";
import { getCalls, getCallsTranscript, getCampaigns,  getAgents, } from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";
import { Select } from "@/components/ui/Input";




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



function formatDateTime(iso: string): string {
  if (!iso) return "—";

  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart) return iso;

  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${day} ${months[Number(month) - 1]} ${year}, ${hour}:${minute}`;
}



export default function LiveCalls() {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [campaigns, setCampaigns] = useState<{ uid: string; name: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [agents, setAgents] = useState<{ uid: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current && transcript.length > 0) {
      transcriptRef.current.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcript]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadCalls = async () => {
      if (document.visibilityState !== "visible") return;

      const client_uid = localStorage.getItem("active_client_id");

      if (!client_uid) {
        setCalls([]);
        return;
      }

      try {
        const res = await getCalls({
          client_uid,
          campaign_uid: campaignId || null,
          agent_uid: agentId || null,
          only_without_campaign: !campaignId,
        });

        setCalls(
          (res.data.calls ?? []).filter(
            (c: LiveCall) => !c.finished
          )
        );
      } catch {
        setCalls([]);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadCalls();

        if (!interval) {
          interval = setInterval(loadCalls, 10000);
        }
      } else {
        if (interval) {
          clearInterval(interval);
          interval = undefined;
        }
      }
    };

    handleVisibilityChange();

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [campaignId, agentId]);


  useEffect(() => {
    if (!selectedCall) {
      setTranscript([]);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const loadTranscript = async () => {
      // Don't call API if tab is inactive
      if (document.visibilityState !== "visible") return;

      setLoadingTranscript(true);

      try {
        const res = await getCallsTranscript({
          uid: selectedCall.uid,
        });

        // if ((res.data.finished_transcript ?? []).length > 0) {
        //   setTranscript(res.data.finished_transcript);
        // } else {
        //   setTranscript(res.data.live_transcript ?? []);
        // }
        const finished = res.data.finished_transcript ?? [];
        const live = res.data.live_transcript ?? [];

        if (finished.length > 0) {
          setTranscript(finished);
        } else {
          setTranscript(live);
        }
      } catch {
        setTranscript([]);
      } finally {
        setLoadingTranscript(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadTranscript();

        interval = setInterval(loadTranscript, 3000);
      } else {
        if (interval) {
          clearInterval(interval);
          interval = undefined;
        }
      }
    };

    // Initial load only if tab is active
    handleVisibilityChange();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedCall]);

  useEffect(() => {
    const client_uid = localStorage.getItem("active_client_id");

    if (!client_uid) return;

    getCampaigns({ client_uid })
      .then((r) => setCampaigns(r.data.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    const client_uid = localStorage.getItem("active_client_id");

    if (!client_uid) return;

    getAgents({ client_uid })
      .then((r) => setAgents(r.data.agents ?? []))
      .catch(() => setAgents([]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Live Calls</h2>

        <div className="flex items-center gap-3">
          <Select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Select Campaign</option>

            {campaigns.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">All Agents</option>

            {agents.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {calls.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No active calls</CardContent></Card>
      ) : (
        // <div className="grid gap-4">
        //   {calls.map((call) => (
        //     <Card key={call.call_id} className="border-green-200">
        //       <CardHeader className="flex flex-row items-center justify-between">
        //         <CardTitle className="text-base">{call.agent_name}</CardTitle>
        //         <Badge status={call.status} />
        //       </CardHeader>
        //       <CardContent>
        //         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
        //           <div>
        //             <span className="text-slate-500">Number</span>
        //             <p className="font-mono">{call.caller_number || "—"}</p>
        //           </div>
        //           <div><span className="text-slate-500">Duration</span><p>{call.duration_seconds}s</p></div>
        //           <div><span className="text-slate-500">Agent Speaking</span><p>{call.agent_speaking ? "Yes" : "No"}</p></div>
        //           <div><span className="text-slate-500">Sentiment</span><p>{call.sentiment_score?.toFixed(2) ?? "—"}</p></div>
        //         </div>
        //         <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto text-sm">
        //           {(transcripts[call.call_id] || (call.latest_transcript ? [call.latest_transcript] : [])).map((t, i) => (
        //             <p key={i} className="mb-1">{t}</p>
        //           ))}
        //         </div>
        //       </CardContent>
        //     </Card>
        //   ))}
        // </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Call ID</th>
                    <th className="text-left px-4 py-3">Started</th>
                    <th className="text-left px-4 py-3">Campaign</th>
                    <th className="text-left px-4 py-3">Agent</th>
                    <th className="text-left px-4 py-3">Direction</th>
                  </tr>
                </thead>

                <tbody>
                  {calls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No active calls
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => (
                      <tr
                        key={call.uid}
                        onClick={() => setSelectedCall(call)}
                        className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${
                          selectedCall?.uid === call.uid ? "bg-brand-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono">
                          {call.uid.slice(0, 8)}
                        </td>

                        <td className="px-4 py-3 text-xs">
                          {formatDateTime(call.created_at)}
                        </td>

                        <td className="px-4 py-3">
                          {call.campaign_name ?? "Without Campaign"}
                        </td>

                        <td className="px-4 py-3">
                          {call.agent_name}
                        </td>

                        <td className="px-4 py-3">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCall ? selectedCall.uid : "Transcript"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!selectedCall && (
                <p>Select a live call.</p>
              )}

              {loadingTranscript && (
                <p>Loading...</p>
              )}

              {!loadingTranscript && selectedCall && (
                <div
                  ref={transcriptRef}
                  className="space-y-2 max-h-[500px] overflow-y-auto"
                >
                  {transcript.length === 0 ? (
                    <p>No transcript available.</p>
                  ) : (
                    transcript.map((line, i) => {
                      const speaker =
                        line.startsWith("agent says:")
                          ? "Agent"
                          : line.startsWith("user says:")
                          ? "User"
                          : "";

                      const content = line
                        .replace(/^agent says:\s*/i, "")
                        .replace(/^user says:\s*/i, "")
                        .replace(/---/g, "")
                        .trim();

                      return (
                        <div
                          key={i}
                          className={`rounded border p-3 ${
                            speaker === "Agent"
                              ? "bg-blue-50 border-blue-200"
                              : "bg-green-50 border-green-200"
                          }`}
                        >
                          <div className="font-semibold mb-1">
                            {speaker}
                          </div>

                          <div className="text-xs whitespace-pre-wrap">
                            {content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
