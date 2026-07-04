import { useEffect, useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { getCampaigns, getLeadsDetailed, uploadLeads,deleteLeads } from "@/lib/api";

export default function Leads() {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [campaigns, setCampaigns] = useState<{ uid: string; name: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    const client_uid = localStorage.getItem("active_client_id");

    if (!client_uid) return;

    const payload: Record<string, string> = {
      client_uid,
    };

    if (campaignId) {
      payload.campaign_uid = campaignId;
    }

    getLeadsDetailed(payload)
      .then((r) => setLeads(r.data.leads ?? []))
      .catch(() => setLeads([]));

    getLeadsDetailed(payload)
      .then((r) => {
        setLeads(r.data.leads ?? []);
        setSelectedLeads([]);
      })
      .catch(() => {
        setLeads([]);
        setSelectedLeads([]);
      });
  };

  useEffect(() => {
    const client_uid = localStorage.getItem("active_client_id");

    getCampaigns({ client_uid }).then((r) =>
      setCampaigns(r.data.campaigns ?? [])
    );
  }, []);

  useEffect(() => {
    load();
  }, [campaignId]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const client_uid = localStorage.getItem("active_client_id");

      if (!client_uid) {
        alert("Client not selected.");
        return;
      }

      // Read entire CSV
      const leads_csv = await file.text();

      const payload: Record<string, string> = {
        client_uid,
        leads_csv,
      };

      if (campaignId) {
        payload.campaign_uid = campaignId;
      }

      const res = await uploadLeads(payload)

      alert(res.data.message ?? "Leads uploaded successfully.");

      load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((x: any) => x.msg).join(", ")
          : err.message;

      alert(msg);
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };


  const toggleLead = (uid: string) => {
    setSelectedLeads((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  const toggleAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(
        leads.map((l) => l.uid as string)
      );
    }
  };


  const handleDeleteSelected = async () => {
    if (!selectedLeads.length) return;

    if (
      !confirm(`Delete ${selectedLeads.length} selected lead(s)?`)
    ) {
      return;
    }

    try {
      setDeleting(true);

      await deleteLeads({
        uids: selectedLeads,
      });

      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Leads</h2>
        <div className="flex items-center gap-3">
          <Select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.name}
              </option>
            ))}
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload CSV
          </Button>
          <Button
            variant="danger"
            disabled={!selectedLeads.length || deleting}
            onClick={handleDeleteSelected}
          >
            Delete Selected
            {selectedLeads.length > 0 && ` (${selectedLeads.length})`}
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 text-sm text-slate-600">
          CSV columns: <span className="font-mono">phone</span> (required),{" "}
          <span className="font-mono">name</span>, <span className="font-mono">email</span> .{" "}
          Campaign select karo to assign leads — ya bina campaign ke bhi upload kar sakte ho.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-12 px-4 py-3">
                  <div className="flex justify-center items-center">
                    <input
                      type="checkbox"
                      checked={
                        leads.length > 0 &&
                        selectedLeads.length === leads.length
                      }
                      onChange={toggleAll}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Retries</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No leads yet
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr key={l.uid as string} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(l.uid as string)}
                      onChange={() => toggleLead(l.uid as string)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono">{l.phone as string}</td>
                  <td className="px-4 py-3">{(l.name as string) || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge status={l.status as string} />
                  </td>
                  <td className="px-4 py-3">{l.retry_count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
