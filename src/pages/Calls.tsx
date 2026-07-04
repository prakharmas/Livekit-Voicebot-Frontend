import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { exportCallsCsv, getCalls, getCampaigns, getAgents, getCallsTranscript } from "@/lib/api";
import { Select } from "@/components/ui/Input";

// interface TranscriptEntry {
//   id: number;
//   speaker: string;
//   content: string;
//   sentiment: number | null;
//   sequence: number;
// }

interface CallRow {
  uid: string;
  agent_uid: string;
  agent_name: string;
  campaign_uid: string | null;
  campaign_name: string | null;
  is_incoming: boolean;
  created_at: string;
  finished: boolean;
  failure_reason: string;
}

// function displayNumber(c: CallRow): string {
//   if (c.direction === "outbound") return c.callee_number || c.caller_number || "—";
//   return c.caller_number || c.callee_number || "—";
// }

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

// function sentimentLabel(score: number | null) {
//   if (score == null) return "—";
//   if (score >= 0.3) return `Positive (${score.toFixed(2)})`;
//   if (score <= -0.3) return `Negative (${score.toFixed(2)})`;
//   return `Neutral (${score.toFixed(2)})`;
// }

// function sentimentColor(score: number | null) {
//   if (score == null) return "text-slate-500";
//   if (score >= 0.3) return "text-green-600";
//   if (score <= -0.3) return "text-red-600";
//   return "text-amber-600";
// }

export default function Calls() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [campaigns, setCampaigns] = useState<{ uid: string; name: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");

  const [agents, setAgents] = useState<{ uid: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportCallsCsv();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `calls_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

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

  const loadCalls = () => {
    const client_uid = localStorage.getItem("active_client_id");

    if (!client_uid || !agentId) {
      // agent is mandatory
      setCalls([]);
      setSelectedCall(null);
      setTranscript([]);
      return;
    }

    setSelectedCall(null);
    setTranscript([]);

    const payload = {
      client_uid,
      agent_uid: agentId,
      campaign_uid: campaignId,
      only_without_campaign: !campaignId,
    };

    getCalls(payload)
      .then((r) => setCalls(r.data.calls ?? []))
      .catch(() => setCalls([]));
  };

  useEffect(() => {
    loadCalls();
  }, [campaignId, agentId]);


  useEffect(() => {
    if (!selectedCall) {
      setTranscript([]);
      return;
    }

    setLoadingTranscript(true);

    getCallsTranscript({
      uid: selectedCall.uid,
    })
      .then((res) => {
        setTranscript([
          ...(res.data.finished_transcript ?? []),
          ...(res.data.live_transcript ?? []),
        ]);
      })
      .catch(() => setTranscript([]))
      .finally(() => setLoadingTranscript(false));
  }, [selectedCall]);

  // useEffect(() => {
  //   if (!detail?.has_recording || !detail.id) {
  //     setRecordingUrl(null);
  //     setRecordingError(false);
  //     setLoadingRecording(false);
  //     return;
  //   }

  //   let objectUrl: string | null = null;
  //   let cancelled = false;
  //   setLoadingRecording(true);
  //   setRecordingError(false);

  //   fetchCallRecordingBlob(detail.id)
  //     .then((res) => {
  //       if (cancelled) return;
  //       objectUrl = URL.createObjectURL(res.data);
  //       setRecordingUrl(objectUrl);
  //     })
  //     .catch(() => {
  //       if (!cancelled) {
  //         setRecordingUrl(null);
  //         setRecordingError(true);
  //       }
  //     })
  //     .finally(() => {
  //       if (!cancelled) setLoadingRecording(false);
  //     });

  //   return () => {
  //     cancelled = true;
  //     if (objectUrl) URL.revokeObjectURL(objectUrl);
  //     setRecordingUrl(null);
  //   };
  // }, [detail?.id, detail?.has_recording]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Call History</h2>

        <div className="flex items-center gap-3">
          <Select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={!agentId}
          >
            <option value="">Without Campaign</option>
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
            <option value="">Select Agent</option>

            {agents.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name}
              </option>
            ))}
          </Select>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Call ID</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">Agent</th>
                  <th className="text-left px-4 py-3">Direction</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr
                    key={c.uid}
                    onClick={() => setSelectedCall(c)}
                    className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${
                      selectedCall?.uid === c.uid ? "bg-brand-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono">
                      {c.uid.slice(0, 8)}
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {formatDateTime(c.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      {c.campaign_name ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {c.agent_name}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        status={c.is_incoming ? "↓ incoming" : "↑ outgoing"}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        status={c.finished ? "completed" : "running"}
                      />
                    </td>

                    <td className="px-4 py-3 text-red-600">
                      {c.failure_reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCall ? `Call #${selectedCall.uid}` : "Call Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!selectedCall && (
              <p className="text-slate-500">
                Select a call to view transcript.
              </p>
            )}

            {selectedCall && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500">Agent</span>
                    <p>{selectedCall.agent_name}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Campaign</span>
                    <p>{selectedCall.campaign_name ?? "Without Campaign"}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Date</span>
                    <p>{formatDateTime(selectedCall.created_at)}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Direction</span>
                    <p>{selectedCall.is_incoming ? "↓ Incoming" : "↑ Outgoing"}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Status</span>
                    <p>{selectedCall.finished ? "Completed" : "Running"}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Failure Reason</span>
                    <p>{selectedCall.failure_reason || "—"}</p>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-2">
                    Transcript
                  </span>

                  {loadingTranscript ? (
                    <p className="text-slate-500">Loading transcript...</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto rounded-lg bg-slate-50 p-3 space-y-3">
                      {transcript.length === 0 ? (
                        <p className="text-slate-500">No transcript available.</p>
                      ) : (
                        transcript.map((line, index) => {
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
                              key={index}
                              className={`rounded-lg border p-3 ${
                                speaker === "Agent"
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-green-50 border-green-200"
                              }`}
                            >
                              <div className="font-semibold mb-1">
                                {speaker}
                              </div>

                              <div className="whitespace-pre-wrap text-xs">
                                {content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
