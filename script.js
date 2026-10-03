const leadForm = document.querySelector("#leadForm");
const leadStatus = document.querySelector("#leadStatus");
const authForm = document.querySelector("#authForm");
const authStatus = document.querySelector("#authStatus");
const leadList = document.querySelector("#leadList");
const userList = document.querySelector("#userList");
const exportLeads = document.querySelector("#exportLeads");
const exportUsers = document.querySelector("#exportUsers");
const clearDemoData = document.querySelector("#clearDemoData");

const STORAGE_KEYS = {
  leads: "skillgapai_leads",
  users: "skillgapai_demo_users"
};

function getSupabaseClient() {
  const config = window.SKILLGAP_SUPABASE;
  const isReady = config
    && config.url
    && config.anonKey
    && !config.url.includes("PASTE_")
    && !config.anonKey.includes("PASTE_")
    && window.supabase;

  if (!isReady) {
    return null;
  }

  if (!window.skillgapSupabaseClient) {
    window.skillgapSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  }

  return window.skillgapSupabaseClient;
}

async function saveToSupabase(table, record) {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, reason: "Supabase is not configured yet." };
  }

  const { error } = await client.from(table).insert(record);
  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

function readStoredList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeStoredList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveRecord(key, record) {
  const list = readStoredList(key);
  list.unshift({ ...record, createdAt: new Date().toISOString() });
  writeStoredList(key, list);
  return list;
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    alert("No saved data found yet.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderStoredData() {
  if (leadList) {
    const leads = readStoredList(STORAGE_KEYS.leads);
    leadList.innerHTML = leads.length ? "" : `<p class="empty-state">No enquiries saved yet.</p>`;
    leads.forEach((lead) => {
      const item = document.createElement("article");
      const title = document.createElement("strong");
      const contact = document.createElement("span");
      const detail = document.createElement("span");
      item.className = "data-item";
      title.textContent = lead.name || "Unknown lead";
      contact.textContent = `${lead.phone || "No phone"} | ${lead.email || "No email"}`;
      detail.textContent = `${lead.goal || "No goal"} | ${new Date(lead.createdAt).toLocaleString()}`;
      item.append(title, contact, detail);
      leadList.appendChild(item);
    });
  }

  if (userList) {
    const users = readStoredList(STORAGE_KEYS.users);
    userList.innerHTML = users.length ? "" : `<p class="empty-state">No demo users saved yet.</p>`;
    users.forEach((user) => {
      const item = document.createElement("article");
      const title = document.createElement("strong");
      const contact = document.createElement("span");
      const detail = document.createElement("span");
      item.className = "data-item";
      title.textContent = user.name || "Unknown user";
      contact.textContent = `${user.email || "No email"} | ${user.phone || "No phone"}`;
      detail.textContent = `Demo account | ${new Date(user.createdAt).toLocaleString()}`;
      item.append(title, contact, detail);
      userList.appendChild(item);
    });
  }
}

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(leadForm);
    const record = {
      name: data.get("name")?.toString().trim(),
      phone: data.get("phone")?.toString().trim(),
      email: data.get("email")?.toString().trim(),
      goal: data.get("goal")?.toString().trim(),
      source: "website"
    };
    saveRecord(STORAGE_KEYS.leads, record);
    const supabaseResult = await saveToSupabase("skillgap_enquiries", record);
    const message = `Hi SkillGapAI, my name is ${record.name}. I need help with: ${record.goal}. Phone: ${record.phone}. Email: ${record.email || "not shared"}.`;
    if (leadStatus) {
      leadStatus.textContent = supabaseResult.ok
        ? "Saved to Supabase. Opening WhatsApp now."
        : "Saved in this browser. Supabase is not connected yet.";
    }
    window.open(`https://wa.me/919818114438?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    leadForm.reset();
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(authForm);
    const record = {
      name: data.get("name")?.toString().trim(),
      email: data.get("email")?.toString().trim(),
      phone: data.get("phone")?.toString().trim(),
      source: "website"
    };
    saveRecord(STORAGE_KEYS.users, { ...record, passwordSet: true });
    const supabaseResult = await saveToSupabase("skillgap_demo_users", record);
    if (authStatus) {
      authStatus.textContent = supabaseResult.ok
        ? "Demo user saved to Supabase."
        : "Demo user saved in this browser. Supabase is not connected yet.";
    }
    authForm.reset();
  });
}

if (exportLeads) {
  exportLeads.addEventListener("click", () => downloadCsv("skillgapai-enquiries.csv", readStoredList(STORAGE_KEYS.leads)));
}

if (exportUsers) {
  exportUsers.addEventListener("click", () => downloadCsv("skillgapai-demo-users.csv", readStoredList(STORAGE_KEYS.users)));
}

if (clearDemoData) {
  clearDemoData.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.leads);
    localStorage.removeItem(STORAGE_KEYS.users);
    renderStoredData();
  });
}

renderStoredData();
