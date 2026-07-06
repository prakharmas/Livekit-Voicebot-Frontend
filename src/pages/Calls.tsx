import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCalls, getCampaigns, getAgents, getCallsTranscript, getCallRecording } from "@/lib/api";
// import { exportCallsCsv, getCalls, getCampaigns, getAgents, getCallsTranscript, getCallRecording } from "@/lib/api";
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
  customer_phone: string | null;
  is_incoming: boolean;
  created_at: string;
  started_at: string;
  ended_at: string;
  finished: boolean;
  failure_reason: string;
  sentiment: string;
  has_recording: boolean;
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
  // const [exporting, setExporting] = useState(false);

  const [campaigns, setCampaigns] = useState<{ uid: string; name: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");

  const [agents, setAgents] = useState<{ uid: string; name: string }[]>([]);
  const [agentId, setAgentId] = useState("");

  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(false);

  // const handleExport = async () => {
  //   setExporting(true);
  //   try {
  //     const res = await exportCallsCsv();
  //     const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `calls_export_${new Date().toISOString().slice(0, 10)}.csv`;
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //   } finally {
  //     setExporting(false);
  //   }
  // };

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

    if (!client_uid) {
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
      agent_uid: agentId || null,
      campaign_uid: campaignId || null,
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

  useEffect(() => {
    if (!selectedCall?.has_recording) {
      setRecordingUrl(null);
      setRecordingError(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    setLoadingRecording(true);
    setRecordingError(false);

    getCallRecording({
      uid: selectedCall.uid,
    })
      .then((res) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(res.data);
        setRecordingUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setRecordingError(true);
          setRecordingUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRecording(false);
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedCall]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Call History</h2>

        <div className="flex items-center gap-3">
          <Select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
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
            <option value="">All Agent</option>

            {agents.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name}
              </option>
            ))}
          </Select>

          {/* <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button> */}
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
                  <th className="text-left px-4 py-3">Number</th>
                  <th className="text-left px-4 py-3">Direction</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Failure Reason</th>
                  <th className="text-left px-4 py-3">Sentiment</th>
                  <th className="text-left px-4 py-3">Recording</th>
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
                      {c.customer_phone}
                    </td>

                    <td className="px-4 py-3">
                      {/* <Badge
                        status={c.is_incoming ? "↓ incoming" : "↑ outgoing"}
                      /> */}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.is_incoming
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {c.is_incoming ? "↓ In" : "↑ Out"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        status={c.finished ? "completed" : "running"}
                      />
                    </td>

                    <td className="px-4 py-3 text-red-600">
                      {c.failure_reason || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.sentiment?.toLowerCase() === "positive"
                            ? "bg-green-100 text-green-700"
                            : c.sentiment?.toLowerCase() === "negative"
                            ? "bg-red-100 text-red-700"
                            : c.sentiment?.toLowerCase() === "neutral"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.sentiment
                          ? c.sentiment.length > 20
                            ? `${c.sentiment.slice(0, 20)}...`
                            : c.sentiment
                          : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.has_recording
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.has_recording ? "Available" : "No"}
                      </span>
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
                    <span className="text-slate-500">Customer</span>
                    <p className="font-mono">
                      {selectedCall.customer_phone ?? "—"}
                    </p>
                  </div>

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
                    <p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          selectedCall.is_incoming
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {selectedCall.is_incoming ? "↓ Inbound" : "↑ Outbound"}
                      </span>
                    </p>
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
                  <span className="text-slate-500">Started At</span>
                  <p>{formatDateTime(selectedCall.started_at)}</p>
                </div>


                <div>
                  <span className="text-slate-500">Ended At</span>
                  <p>{formatDateTime(selectedCall.ended_at)}</p>
                </div>


                <div>
                  <span className="text-slate-500 block mb-2 font-medium">
                    Recording
                  </span>

                  {!selectedCall.has_recording ? (
                    <p className="text-slate-500">No recording available.</p>
                  ) : loadingRecording ? (
                    <p className="text-slate-500">Loading recording...</p>
                  ) : recordingError ? (
                    <p className="text-red-600">
                      Unable to load recording.
                    </p>
                  ) : recordingUrl ? (
                    <audio controls className="w-full">
                      <source src={recordingUrl} type="audio/mpeg" />
                      Your browser does not support audio playback.
                    </audio>
                  ) : null}
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
