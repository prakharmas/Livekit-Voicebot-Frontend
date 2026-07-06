import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { createAgent, deleteAgent, getAgents, readAgent, updateAgent, enableAgent } from "@/lib/api";

interface Agent {
  uid: string;
  name: string;
  enabled: boolean;
}

interface ReadAgentResponse {
  success: boolean;
  client_uid: string;
  name: string;
  sip_id: string;
  xfer_sip_id: string;
  prompt: string;
  sentiment_prompt: string;
  extraction_prompt: string;
  max_concurrent_calls: number;
  lead_fields: {
    name: string;
    description: string;
  }[];
}


function textToLeadFields(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(":");

      return {
        name: name.trim(),
        description: rest.join(":").trim(),
      };
    });
}

function leadFieldsToText(
  lead_fields: { name: string; description: string }[] = []
) {
  return lead_fields
    .map((f) => `${f.name}: ${f.description}`)
    .join("\n");
}

type AgentForm = {
  name: string;
  sip_id: string;
  xfer_sip_id: string;
  prompt: string;
  sentiment_prompt: string;
  extraction_prompt: string;
  max_concurrent_calls: number;
  lead_fields_text: string;
};

const defaultForm: AgentForm = {
  name: "",
  sip_id: "",
  xfer_sip_id: "",
  prompt: "",
  sentiment_prompt: "",
  extraction_prompt: "",
  max_concurrent_calls: 1,
  lead_fields_text:
    "customer_name: Customer name\nphone: Mobile number",
};

// function agentToForm(agent: Agent): AgentForm {
//   return {
//     name: agent.name,
//     sip_id: "",
//     xfer_sip_id: "",
//     prompt: "",
//     max_concurrent_calls: 1,
//     lead_fields_text: "",
//   };
// }

function AgentFormFields({
  form,
  setForm,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: AgentForm;
  setForm: (f: AgentForm) => void;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        placeholder="Agent Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        placeholder="SIP ID"
        value={form.sip_id}
        onChange={(e) => setForm({ ...form, sip_id: e.target.value })}
      />

      <Input
        placeholder="Transfer SIP ID"
        value={form.xfer_sip_id}
        onChange={(e) => setForm({ ...form, xfer_sip_id: e.target.value })}
      />
      <Input
        type="number"
        min={1}
        placeholder="Max Concurrent Calls"
        value={form.max_concurrent_calls}
        onChange={(e) => setForm({ ...form, max_concurrent_calls: Number(e.target.value) || 1, })}
      />
      {/* <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
        <option value="en-IN">English</option>
        <option value="hi-IN">Hindi</option>
        <option value="hi-en">Hinglish</option>
      </Select>
      <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
        <option value="sarvam">Sarvam</option>
        <option value="openai">OpenAI</option>
      </Select>
      <Input
        placeholder="Voice (e.g. simran)"
        value={form.voice}
        onChange={(e) => setForm({ ...form, voice: e.target.value })}
      />
      <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
        <option value="female">Female (uses feminine Hindi grammar)</option>
        <option value="male">Male (uses masculine Hindi grammar)</option>
      </Select>
      <Input
        placeholder="Model (e.g. gpt-4o-mini)"
        value={form.model}
        onChange={(e) => setForm({ ...form, model: e.target.value })}
      /> */}
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-500 mb-1 block">System prompt</label>
        <Textarea
          rows={12}
          className="min-h-[200px] font-mono text-xs"
          placeholder="System Prompt — scripts, SOP, renewal flow, etc."
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Sentiment prompt</label>
        <Textarea
          rows={12}
          className="min-h-[200px] font-mono text-xs"
          placeholder="Sentiment Prompt"
          value={form.sentiment_prompt}
          onChange={(e) => setForm({ ...form, sentiment_prompt: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-500 mb-1 block">
          Extraction prompt
        </label>

        <Textarea
          rows={12}
          className="min-h-[200px] font-mono text-xs"
          placeholder="Extraction Prompt"
          value={form.extraction_prompt}
          onChange={(e) =>
            setForm({
              ...form,
              extraction_prompt: e.target.value,
            })
          }
        />
      </div>
      <Textarea
        rows={5}
        placeholder={"customer_name: Customer name\nphone: Mobile number"}
        value={form.lead_fields_text}
        onChange={(e) => setForm({ ...form, lead_fields_text: e.target.value })}
      />
      {/* <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Greeting (first thing caller hears)</label>
        <Textarea
          rows={3}
          value={form.greeting}
          onChange={(e) => setForm({ ...form, greeting: e.target.value })}
        />
      </div>
      <Input
        placeholder="Fallback Message"
        value={form.fallback_message}
        onChange={(e) => setForm({ ...form, fallback_message: e.target.value })}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-slate-500">Temperature</label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.6 })}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500">Max tokens</label>
          <Input
            type="number"
            min={50}
            max={500}
            value={form.max_tokens}
            onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value, 10) || 120 })}
          />
        </div>
      </div>
      <div className="md:col-span-2 border-t border-slate-200 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.transfer_enabled}
            onChange={(e) => setForm({ ...form, transfer_enabled: e.target.checked })}
          />
          Enable call transfer to a human agent
        </label>
        {form.transfer_enabled && (
          <div className="mt-2">
            <label className="text-xs text-slate-500">
              Transfer phone number (E.164, e.g. +919911362206)
            </label>
            <Input
              type="tel"
              placeholder="+919911362206"
              value={form.transfer_number}
              onChange={(e) => setForm({ ...form, transfer_number: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">
              The bot transfers here when the customer asks for a human, is
              frustrated, or asks something outside its scope.
            </p>
          </div>
        )}
      </div>
      <div className="md:col-span-2 border-t border-slate-200 pt-3">
        <label className="text-sm text-slate-700">Data to collect from the call</label>
        <p className="mb-1 text-xs text-slate-400">
          One field per line, format <code>key: description</code>. The bot asks for
          these during the call and they're auto-extracted from the transcript afterwards.
        </p>
        <Textarea
          rows={5}
          placeholder={"name: customer full name\nphone: contact number\ncity: city and state"}
          value={form.data_fields_text}
          onChange={(e) => setForm({ ...form, data_fields_text: e.target.value })}
        />
      </div>
      <div className="md:col-span-2 border-t border-slate-200 pt-3">
        <label className="text-sm text-slate-700">Required lead fields (outbound)</label>
        <p className="mb-1 text-xs text-slate-400">
          Comma-separated CSV column names that MUST be present for each lead, e.g.{" "}
          <code>customer_name, current_plan_name, current_plan_fee, whatsapp_link</code>.
          Leads missing any of these are skipped at dial time. Use the <code>{"{token}"}</code>{" "}
          names from your prompt. Leave blank to dial every lead.
        </p>
        <Input
          placeholder="customer_name, current_plan_name, whatsapp_link"
          value={form.required_lead_fields}
          onChange={(e) => setForm({ ...form, required_lead_fields: e.target.value })}
        />
      </div> */}
      <div className="md:col-span-2 flex gap-2">
        <Button onClick={onSubmit}>{submitLabel}</Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AgentForm>(defaultForm);
  const [editForm, setEditForm] = useState<AgentForm>(defaultForm);
  const [testResult, setTestResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    const client_uid = localStorage.getItem("active_client_id");

    getAgents({ client_uid })
      .then((r) => setAgents(r.data.agents ?? []))
      .catch(() => setAgents([]));
  };

  useEffect(() => {
    load();
  }, []);

  const toPayload = (form: AgentForm) => ({
    client_uid: localStorage.getItem("active_client_id"),
    name: form.name,
    sip_id: form.sip_id,
    xfer_sip_id: form.xfer_sip_id,
    prompt: form.prompt,
    sentiment_prompt: form.sentiment_prompt,
    extraction_prompt: form.extraction_prompt,
    max_concurrent_calls: form.max_concurrent_calls,
    lead_fields: textToLeadFields(form.lead_fields_text),
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createAgent(toPayload(createForm));
      setShowCreate(false);
      setCreateForm(defaultForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (agent: Agent) => {
    setShowCreate(false);
    setTestResult("");

    try {
      const { data }: { data: ReadAgentResponse } = await readAgent(agent.uid);

      setEditingId(agent.uid);

      setEditForm({
        name: data.name,
        sip_id: data.sip_id,
        xfer_sip_id: data.xfer_sip_id,
        prompt: data.prompt,
        sentiment_prompt: data.sentiment_prompt,
        extraction_prompt: data.extraction_prompt,
        max_concurrent_calls: data.max_concurrent_calls,
        lead_fields_text: leadFieldsToText(data.lead_fields),
      });
    } catch (err) {
      console.error(err);
      alert("Unable to load agent details.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultForm);
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    setSaving(true);
    try {
      await updateAgent({ uid: editingId, ...toPayload(editForm),});
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  // const handleTest = async (uid: string, name: string) => {
  //   const { data } = await testAgent(id, "Namaste, main renewal ke baare mein poochhna chahta hoon");
  //   setTestResult(`${name}: ${data.response} (${data.latency_ms}ms)`);
  // };

  const toggleActive = async (agent: Agent) => {
    setBusy(agent.uid);

    try {
      await enableAgent({
        uid: agent.uid,
        enable: !agent.enabled,
      });

      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    if (editingId === agent.uid) cancelEdit();
    await deleteAgent({uid :agent.uid});
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">AI Agents</h2>
        <Button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> New Agent
        </Button>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Click <strong>Edit</strong> on an agent to change prompt. Use agent{" "}
        <strong>ID</strong> in Dispatch and Campaigns. Changes apply to the next call (restart worker if a call is
        already in progress).
      </p>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create AI Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentFormFields
              form={createForm}
              setForm={setCreateForm}
              submitLabel={saving ? "Saving…" : "Create Agent"}
              onSubmit={handleCreate}
              onCancel={() => {
                setShowCreate(false);
                setCreateForm(defaultForm);
              }}
            />
          </CardContent>
        </Card>
      )}

      {testResult && (
        <Card className="mb-4 border-brand-200 bg-brand-50">
          <CardContent className="py-3 text-sm whitespace-pre-wrap">{testResult}</CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card key={agent.uid}>
            {editingId === agent.uid ? (
              <CardContent className="pt-6">
                <CardTitle className="text-lg mb-4">
                  Edit agent — {agent.name} <span className="text-slate-400 font-normal">#{agent.uid}</span>
                </CardTitle>
                <AgentFormFields
                  form={editForm}
                  setForm={setEditForm}
                  submitLabel={saving ? "Saving…" : "Save changes"}
                  onSubmit={handleSaveEdit}
                  onCancel={cancelEdit}
                />
              </CardContent>
            ) : (
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <span className="text-xs font-mono text-slate-400">ID #{agent.uid}</span>
                    <Badge status={agent.enabled ? "active" : "inactive"} />
                  </div>
                  {/* <p className="text-sm text-slate-500 mt-1">
                    {agent.language} · {agent.voice} · {agent.provider} · {agent.model}
                  </p>
                  <p className="text-sm text-slate-400 mt-1 italic line-clamp-2">"{agent.greeting}"</p> */}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(agent)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === agent.uid}
                    onClick={() => toggleActive(agent)}
                  >
                    {agent.enabled ? "Deactivate" : "Activate"}
                  </Button>
                  {/* <Button variant="secondary" size="sm" onClick={() => handleTest(agent.uid, agent.name)}>
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button> */}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(agent)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
