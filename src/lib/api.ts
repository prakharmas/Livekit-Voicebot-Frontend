import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

function clearAuthAndRedirect() {
  localStorage.removeItem("access_token");
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Super-admin client switcher: tell the backend which client to act as.
  const clientId = localStorage.getItem("active_client_id");
  if (clientId) {
    config.headers["X-Client-Id"] = clientId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      clearAuthAndRedirect();
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (username: string, password: string) =>
  api.post("/login", { username, password });

export const getMe = () => api.get("/auth/me");
export const readUser = (data: Record<string, unknown>) =>
  api.post("/read-user", data);
export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });
export const resetPassword = (token: string, new_password: string) =>
  api.post("/auth/reset-password", { token, new_password });

// Clients (super admin)
export const getClients = () => api.post("/list-clients");
export const getClientsDetailed = () => api.post("/list-clients-detailed");
export const createClient = (data: Record<string, unknown>) => api.post("/create-client", data);

// Users (super admin)

export const createUser = (data: Record<string, unknown>) =>
  api.post("/create-user", data);
export const editUser = (data: Record<string, unknown>) =>
  api.post("/edit-user", data);
export const deleteUser = (data: Record<string, unknown>) =>
  api.post("/delete-user", data);

// Agents
export const getAgents = (data: Record<string, unknown>) => api.post("/list-agents", data);
export const readAgent = (uid: string) =>
  api.post("/read-agent", { uid,});
export const createAgent = (data: Record<string, unknown>) => api.post("/create-agent", data);
export const updateAgent = (data: Record<string, unknown>) =>
  api.post("/edit-agent", data);
export const enableAgent = (data: Record<string, unknown>) =>
  api.post("/enable-agent", data);
export const deleteAgent = (data: Record<string, unknown>) => api.post("/delete-agent", data);
export const testAgent = (id: number, message: string) =>
  api.post(`/agents/${id}/test`, { message });

// SIP
export const getSipTrunks = () => api.get("/sip-trunks");
export const createSipTrunk = (data: Record<string, unknown>) => api.post("/sip-trunks", data);
export const syncSipTrunksFromLiveKit = () => api.post("/sip-trunks/sync-from-livekit");
export const testSipTrunk = (id: number) => api.post(`/sip-trunks/${id}/test`);

// Dispatch
export const getDispatchRules = () => api.get("/dispatch");
export const createDispatchRule = (data: Record<string, unknown>) => api.post("/dispatch", data);
export const updateDispatchRule = (
  id: number,
  data: Record<string, unknown>,
  applyLivekit = false
) => api.patch(`/dispatch/${id}`, data, { params: applyLivekit ? { apply_livekit: true } : {} });
export const applyDispatchToLiveKit = (id: number) => api.post(`/dispatch/${id}/apply-livekit`);
export const applyAllDispatchToLiveKit = () => api.post("/dispatch/apply-all-livekit");
export const syncDispatchFromLiveKit = () => api.post("/dispatch/sync-from-livekit");
export const deleteDispatchRule = (id: number) => api.delete(`/dispatch/${id}`);

// Campaigns & Leads
export const getCampaigns = (data: Record<string, unknown>) => api.post("/list-campaigns", data);
export const getCampaignsDetailed = (data: Record<string, unknown>) => api.post("/list-campaigns-detailed", data);
export const createCampaign = (data: Record<string, unknown>) => api.post("/create-campaign", data);
export const updateCampaignStatus = (data: Record<string, unknown>) =>
  api.post("/enable-campaign", data);
export const deleteCampaigns = (data: Record<string, unknown>) => api.post("/delete-campaign", data);
export const dialCampaign = (id: number, limit?: number) =>
  api.post(`/campaigns/${id}/dial`, null, { params: limit != null ? { limit } : {} });
export const getCampaignStats = (id: number) => api.get(`/campaigns/${id}/stats`);
export const getLeads = (data: Record<string, unknown>) =>
  api.post("/list-leads", data);
export const getLeadsDetailed = (data: Record<string, unknown>) =>
  api.post("/list-leads-detailed", data);
// export const uploadLeads = (file: File, campaignId?: number) => {
//   const form = new FormData();
//   form.append("file", file);
//   return api.post("/leads/upload", form, {
//     params: campaignId ? { campaign_id: campaignId } : {},
//     // Override the instance-level "application/json" default so axios can auto-set
//     // "multipart/form-data; boundary=..." from the FormData body.
//     headers: { "Content-Type": undefined },
//   });
// };
export const uploadLeads = (data: Record<string, unknown>) => api.post("/create-leads", data);
export const deleteLeads = (data: { uids: string[] }) =>
  api.post("/delete-leads", data);

// Calls
export const getCalls = (data: Record<string, unknown>) => api.post("/list-calls-detailed", data);
export const getCallsTranscript = (data: Record<string, unknown>) => api.post("/get-call-transcript", data);
/** Download all calls (with collected-data columns) as CSV. */
// export const exportCallsCsv = (campaignId?: number) =>
//   api.get("/calls/export.csv", {
//     params: campaignId ? { campaign_id: campaignId } : {},
//     responseType: "blob",
//   });
export const exportCampaignReport = (uid: string) =>
  api.post(
    "/get-campaign-report",
    { uid },
    {
      responseType: "blob",
    }
  );
export const getLiveCalls = () => api.get("/calls/live");
export const getCall = (id: number) => api.get(`/calls/${id}`);

/** Authenticated fetch — required because <audio src> cannot send Bearer tokens. */
export const getCallRecording = (data: { uid: string }) =>
  api.post("/get-call-recording", data, {
    responseType: "blob",
  });

// Analytics
export const getDashboardStats = (data: Record<string, unknown>) =>
  api.post("/dashboard", data);
export const getAgentPerformance = (days = 30) =>
  api.get("/analytics/agents", { params: { days } });
export const getCampaignPerformance = () => api.get("/analytics/campaigns");
export const getSystemHealth = () => api.get("/analytics/health");

// Integrations & WhatsApp
export const getIntegrations = () => api.get("/integrations");
export const createIntegration = (data: Record<string, unknown>) =>
  api.post("/integrations", data);
export const getWhatsAppLogs = () => api.get("/whatsapp/logs");
