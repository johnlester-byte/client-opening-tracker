/* ============================================================================
   CLIENT OPENING TRACKER  —  APP LOGIC (what the page DOES)

   You normally do NOT need this file to change how things LOOK — colors and
   layout live in styles.css. This file is the behavior.

   How it's organized, top to bottom:
     1.  CONFIG ........ database connection settings
     2.  State ......... the in-memory client list + translators
     3.  Auth .......... sign in / sign out
     4.  Data load ..... read everything from the database + keep it live
     5.  Helpers ....... date math, follow-up flags, text escaping
     6.  Rendering ..... draw the table, stat cards, page buttons
     7.  Add / Edit .... the client dialog
     8.  Delete ........ remove a client (with a confirm step)
     9.  Activity log .. records who changed what
     10. CSV export
     11. Startup
   ============================================================================ */

/* ============================================================================
   CLIENT OPENING TRACKER
   A single-page app. All data lives in a Supabase table called `locations`.
   The page reads/writes that table directly, so every teammate sees the same
   data live. Access requires a real login (Supabase Auth); every change is
   written to an `activity_log` table.
   Sections below: CONFIG → state → AUTH → data load → helpers → rendering →
   add/edit modal → delete → activity log → CSV export → misc/startup.
   ========================================================================== */

// --- Connection settings -----------------------------------------------------
const CONFIG = {
  supabaseUrl: 'https://hhistoyrbwxyywoyhdod.supabase.co',   // the project's API URL
  supabaseKey: 'sb_publishable_odHKPTKaGUQ4VRAs5iG5pg_9VtFRgbJ' // public ("anon") key — safe to expose
};

// --- App state ---------------------------------------------------------------
const sb = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey); // DB client
let data = [];                 // all rows loaded from the database (camelCase form)
let currentUser = null;        // the logged-in Supabase user (null when signed out)
let currentPage = 1;           // which page of the table is showing
let currentView = 'active';    // 'active' | 'opened' | 'activity'
const PAGE_SIZE = 10;          // rows shown per page
const STATUS_LABELS = { "on-track":"On track","at-risk":"At risk","delayed":"Delayed","opened":"Opened" };

// The database uses snake_case column names; the app uses camelCase. These two
// helpers translate between the two shapes whenever we read or write.
function toDb(o){ return { id:o.id, client_name:o.clientName, name:o.name, tier:o.tier, opening_date:o.openingDate, tracker:o.tracker, status:o.status, notes:o.notes, pre_open_done:o.preOpenDone, post_open_done:o.postOpenDone, opened_date:o.openedDate||null, open_outcome:o.openOutcome||null }; }
function fromDb(r){ return { id:r.id, clientName:r.client_name, name:r.name, tier:r.tier, openingDate:r.opening_date, tracker:r.tracker, status:r.status, notes:r.notes, preOpenDone:r.pre_open_done, postOpenDone:r.post_open_done, openedDate:r.opened_date, openOutcome:r.open_outcome }; }

/* --- Authentication ----------------------------------------------------------
   The app stays hidden behind a login screen until a valid session exists.
   Accounts are created by an admin in the Supabase dashboard.                */
// Try to sign in with the email + password from the login form.
async function signIn() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  document.getElementById('loginErr').textContent = '';
  document.getElementById('loginBtn').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  document.getElementById('loginBtn').disabled = false;
  if (error) { document.getElementById('loginErr').textContent = error.message; }
  // On success, onAuthStateChange (below) reveals the app automatically.
}
// Sign the current user out (returns them to the login screen).
async function signOut() { await sb.auth.signOut(); }

// React to login/logout. Shows or hides the app and loads data when signed in.
function handleAuth(session) {
  currentUser = session ? session.user : null;
  const loggedIn = !!currentUser;
  document.getElementById('loginScreen').style.display = loggedIn ? 'none' : 'flex';
  document.getElementById('app').style.display = loggedIn ? 'block' : 'none';
  if (loggedIn) {
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = (currentUser.email || '?').charAt(0).toUpperCase();
    document.getElementById('loginPass').value = '';
    load();
  }
}

// Fetch every row from the database into `data`, then redraw the table.
async function load() {
  if (!currentUser) return;     // only logged-in users can read data
  const { data: rows, error } = await sb.from('locations').select('*');
  if (error) { setLive(false, 'Database error: ' + error.message); return; }
  data = rows.map(fromDb);
  setLive(true, 'Live · synced with database');
  render();
}

// Update the little "Live / Database error" status line under the header.
function setLive(ok, msg) {
  document.getElementById('liveDot').className = 'dot' + (ok ? ' live' : '');
  document.getElementById('liveText').textContent = msg;
}

// Realtime: refresh instantly whenever anyone on the team changes data.
// (Requires the table to be added to the supabase_realtime publication — see docs/.)
sb.channel('locations-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => { load(); if (currentView === 'activity') renderActivity(); })
  .subscribe();

// Backup auto-refresh: reload every 20s so the view stays current even if
// realtime isn't enabled. Skipped while a dialog is open so it never disrupts editing.
setInterval(() => {
  if (!currentUser) return;
  const anyOpen = ['overlay','confirmOverlay','exportOverlay'].some(id => document.getElementById(id).classList.contains('open'));
  if (!anyOpen && document.visibilityState === 'visible') { load(); if (currentView === 'activity') renderActivity(); }
}, 20000);

// --- Date + follow-up helpers ------------------------------------------------
// Whole days from today until the given YYYY-MM-DD (negative = in the past).
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
}
// Pretty-print a YYYY-MM-DD date for display in the table, e.g. "Jul 20, 2026".
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
// Which long notes are currently expanded, keyed by location id (see toggleNote).
let expandedNotes = {};
function toggleNote(id) { expandedNotes[id] = !expandedNotes[id]; render(); }
// Returns the follow-up label(s) a row should show: "Pre-open due" when the
// opening is within 3 days (and pre-open isn't ticked), and "Post-open due"
// once it's 3+ days past opening (and post-open isn't ticked).
function followFlags(loc) {
  const dd = daysUntil(loc.openingDate); const f = [];
  if (!loc.preOpenDone && dd <= 3 && dd >= 0) f.push('Pre-open due');
  if (!loc.postOpenDone && dd <= -3) f.push('Post-open due');
  return f;
}
// Countdown pill shown under the opening date: text + color tone (green/amber/red/opened).
function countdownInfo(l) {
  if (l.status === 'opened') return { cd: 'Opened', tone: 'opened' };
  const dd = daysUntil(l.openingDate);
  if (dd < 0) return { cd: `${-dd}d overdue`, tone: 'red' };
  if (dd === 0) return { cd: 'opens today', tone: 'amber' };
  if (dd <= 10) return { cd: `in ${dd}d`, tone: 'amber' };
  return { cd: `in ${dd}d`, tone: 'green' };
}
// Escape user text before putting it in HTML, to prevent broken markup / injection.
function esc(s){ return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Returns the rows to show given the current tab/search/filters, sorted by date.
// Shared by render() and the CSV export so they always match.
function getFilteredList() {
  const q = document.getElementById('search').value.toLowerCase();   // search text
  const sf = document.getElementById('statusFilter').value;          // status filter
  const tf = document.getElementById('tierFilter').value;            // tier filter
  return data
    .filter(l => currentView === 'opened' ? l.status === 'opened' : l.status !== 'opened')
    .filter(l => (l.name + ' ' + (l.clientName||'') + ' ' + (l.tracker||'')).toLowerCase().includes(q))
    .filter(l => currentView === 'opened' || !sf || l.status === sf)
    .filter(l => !tf || l.tier === tf)
    .sort((a,b) => (a.openingDate||'').localeCompare(b.openingDate||''));
}

// --- Main rendering ----------------------------------------------------------
// Rebuilds the table from `data`, applying the current tab, search box,
// and the status/tier filters, then paginating the result.
function render() {
  // Update tab counts + which tab looks active
  const openedCount = data.filter(l => l.status === 'opened').length;
  document.getElementById('cnt-opened').textContent = openedCount;
  document.getElementById('cnt-active').textContent = data.length - openedCount;
  document.getElementById('tab-active').classList.toggle('active', currentView === 'active');
  document.getElementById('tab-opened').classList.toggle('active', currentView === 'opened');
  document.getElementById('tab-activity').classList.toggle('active', currentView === 'activity');

  // The Activity Log tab swaps the table out for the log panel.
  const isActivity = currentView === 'activity';
  document.getElementById('tableView').style.display = isActivity ? 'none' : '';
  document.getElementById('activityPanel').style.display = isActivity ? 'block' : 'none';
  if (isActivity) { renderActivity(); return; }

  // Status filter only applies to the active queue
  document.getElementById('statusFilter').style.display = currentView === 'opened' ? 'none' : '';

  const list = getFilteredList();

  // Work out which slice of rows this page should show.
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  // Build the table rows. `cd` is the small countdown pill under the date.
  document.getElementById('rows').innerHTML = pageItems.map(l => {
    const { cd, tone } = countdownInfo(l);
    const flags = followFlags(l);
    const rowClass = l.status === 'at-risk' ? 'row-at-risk' : l.status === 'delayed' ? 'row-delayed' : '';
    const initial = (l.clientName || l.name || '?').charAt(0).toUpperCase();
    const trackers = (l.tracker || '').split('|').map(t => t.trim()).filter(Boolean);
    const note = l.notes || '';
    const isLong = note.length > 95;
    const expanded = !!expandedNotes[l.id];
    const clamp = isLong && !expanded;
    return `<tr class="${rowClass}">
      <td><div class="name-cell"><div class="avatar">${esc(initial)}</div><b>${esc(l.clientName||'—')}</b></div></td>
      <td><div class="loc-name">${esc(l.name)}</div>${note?`<p class="loc-note${clamp?' clamp':''}">${esc(note)}</p>`:''}${isLong?`<button class="more-btn" onclick="toggleNote('${l.id}')">${expanded?'Show less':'Show more'}</button>`:''}</td>
      <td><span class="tier-pill">${esc(l.tier||'—')}</span></td>
      <td><div class="date-val">${esc(formatDate(l.openingDate))}</div><span class="countdown cd-${tone}">${esc(cd)}</span></td>
      <td><div class="tracker-wrap">${trackers.length ? trackers.map(t=>`<span class="tracker-pill">${esc(t)}</span>`).join('') : '<span class="no-follow">—</span>'}</div></td>
      <td><span class="badge b-${l.status}"><span class="sdot"></span>${STATUS_LABELS[l.status]||l.status}</span></td>
      <td>${flags.length ? flags.map(f=>`<span class="follow-pill"><span class="fdot"></span>${esc(f)}</span>`).join(' ') : '<span class="no-follow">—</span>'}</td>
      <td class="row-actions"><button onclick="openModal('${l.id}')">Edit</button></td>
    </tr>`;
  }).join('');
  document.getElementById('empty').style.display = list.length ? 'none' : 'block';
  renderPager(list.length, totalPages, start, pageItems.length);
  renderStats();
}

// Draw the "Showing x–y of N" text and the page-number buttons.
function renderPager(total, totalPages, start, shown) {
  const pager = document.getElementById('pager');
  // No rows: hide the bar entirely instead of leaving an empty bordered box
  // sitting above the "No clients here yet" message.
  if (total === 0) { pager.innerHTML = ''; pager.style.display = 'none'; return; }
  pager.style.display = 'flex';
  let btns = `<button onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹ Prev</button>`;
  for (let p = 1; p <= totalPages; p++) {
    btns += `<button class="${p===currentPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
  }
  btns += `<button onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>Next ›</button>`;
  pager.innerHTML = `<span class="info">Showing ${start+1}–${start+shown} of ${total}</span><span class="pages">${btns}</span>`;
}

// Switch between the "Active Queue", "Opened", and "Activity Log" tabs.
function switchView(v) {
  currentView = v;
  currentPage = 1;
  render();
}

// Jump to a specific page number and scroll back to the top.
function goPage(p) {
  currentPage = p;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Recompute and draw the summary cards at the top from the full dataset.
function renderStats() {
  const total = data.length;
  const upcoming = data.filter(l => l.status!=='opened' && daysUntil(l.openingDate) >= 0).length;
  const needFollow = data.filter(l => followFlags(l).length).length;   // currently have a pre/post-open flag
  const atRisk = data.filter(l => l.status==='at-risk'||l.status==='delayed').length;
  const opened = data.filter(l => l.status==='opened').length;
  document.getElementById('stats').innerHTML = `
    <div class="stat s-total"><div class="top"><span class="dot"></span><span class="l">Total</span></div><div class="n">${total}</div><div class="sub">all locations</div></div>
    <div class="stat s-upcoming"><div class="top"><span class="dot"></span><span class="l">Upcoming</span></div><div class="n">${upcoming}</div><div class="sub">in the pipeline</div></div>
    <div class="stat s-opened-card"><div class="top"><span class="dot"></span><span class="l">Opened</span></div><div class="n">${opened}</div><div class="sub">live &amp; launched</div></div>
    <div class="stat s-follow ${needFollow ? 'due' : 'ok'}"><div class="top"><span class="dot"></span><span class="l">Need follow-up</span></div><div class="n">${needFollow}</div><div class="sub">${needFollow ? 'action required' : 'all clear'}</div></div>
    <div class="stat s-risk"><div class="top"><span class="dot"></span><span class="l">At risk / delayed</span></div><div class="n">${atRisk}</div><div class="sub">${atRisk ? 'needs attention' : 'none flagged'}</div></div>`;
}

// Show/hide the "Opened workflow" fields depending on the chosen status.
function toggleOpenedFields() {
  const opened = document.getElementById('f-status').value === 'opened';
  // 'contents' keeps the two inner fields flowing inside the form grid.
  document.getElementById('openedFields').style.display = opened ? 'contents' : 'none';
}

/* --- Add / Edit dialog -------------------------------------------------------
   Opens the form. Pass an id to edit an existing client; pass nothing to add. */
function openModal(id) {
  if (id) {
    // EDIT: pre-fill the form with the chosen client's current values.
    const l = data.find(x => x.id === id);
    document.getElementById('modalTitle').textContent = 'Edit Client';
    document.getElementById('f-id').value = l.id;
    document.getElementById('f-client').value = l.clientName || '';
    document.getElementById('f-name').value = l.name;
    document.getElementById('f-tier').value = l.tier || 'Basic (+)';
    document.getElementById('f-date').value = l.openingDate;
    document.getElementById('f-tracker').value = l.tracker || '';
    document.getElementById('f-status').value = l.status;
    document.getElementById('f-notes').value = l.notes || '';
    document.getElementById('f-pre').checked = !!l.preOpenDone;
    document.getElementById('f-post').checked = !!l.postOpenDone;
    document.getElementById('f-opened-date').value = l.openedDate || '';
    document.getElementById('f-open-outcome').value = l.openOutcome || '';
    document.getElementById('deleteBtn').style.display = 'block';
  } else {
    // ADD: start with a blank form and sensible defaults.
    document.getElementById('modalTitle').textContent = 'Add Client';
    ['f-id','f-client','f-name','f-tracker','f-notes','f-opened-date','f-open-outcome'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('f-date').value = '';
    document.getElementById('f-tier').value = 'Basic (+)';
    document.getElementById('f-status').value = 'on-track';
    document.getElementById('f-pre').checked = false;
    document.getElementById('f-post').checked = false;
    document.getElementById('deleteBtn').style.display = 'none';
  }
  toggleOpenedFields();   // show the opened fields only if status is already "opened"
  document.getElementById('overlay').classList.add('open');
}
function closeModal(){ document.getElementById('overlay').classList.remove('open'); }

// Validate the form and save it to the database (insert or update via upsert).
async function saveLocation() {
  const id = document.getElementById('f-id').value;
  const name = document.getElementById('f-name').value.trim();
  const date = document.getElementById('f-date').value;
  if (!name || !date) { alert('Name and opening date are required.'); return; }
  const status = document.getElementById('f-status').value;
  const existing = id ? data.find(x => x.id === id) : null;   // for change detection
  const obj = {
    id: id || 'loc-' + Date.now(),   // reuse id when editing; generate one when adding
    clientName: document.getElementById('f-client').value.trim(),
    name,
    tier: document.getElementById('f-tier').value,
    openingDate: date,
    tracker: document.getElementById('f-tracker').value.trim(),
    status,
    notes: document.getElementById('f-notes').value.trim(),
    preOpenDone: document.getElementById('f-pre').checked,
    postOpenDone: document.getElementById('f-post').checked,
    // Opened workflow: keep an actual open date (default to today) + outcome note.
    openedDate: status === 'opened' ? (document.getElementById('f-opened-date').value || new Date().toISOString().slice(0,10)) : (document.getElementById('f-opened-date').value || null),
    openOutcome: document.getElementById('f-open-outcome').value.trim() || null
  };
  document.getElementById('saveBtn').disabled = true;
  const { error } = await sb.from('locations').upsert(toDb(obj));
  document.getElementById('saveBtn').disabled = false;
  if (error) { alert('Save failed: ' + error.message); return; }

  // Record the change in the activity log (newly opened gets its own action).
  const label = `${obj.clientName || '—'} — ${obj.name}`;
  if (!existing) logActivity('created', label, '');
  else if (existing.status !== 'opened' && status === 'opened') logActivity('opened', label, obj.openOutcome ? 'Outcome: ' + obj.openOutcome : '');
  else logActivity('updated', label, '');

  closeModal(); toast('Saved'); load();
}

// --- Delete (with confirmation dialog) ---------------------------------------
// Step 1: open the confirm dialog showing which client will be removed.
function deleteLocation() {
  const id = document.getElementById('f-id').value;
  if (!id) return;
  const l = data.find(x => x.id === id);
  document.getElementById('confirmText').innerHTML =
    `This will permanently remove <b>${esc((l&&l.clientName)||(l&&l.name)||'this entry')}</b>. This can't be undone.`;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('open'); }
// Step 2: user confirmed — actually delete the row from the database.
async function confirmYes() {
  const id = document.getElementById('f-id').value;
  const l = data.find(x => x.id === id);
  closeConfirm();
  const { error } = await sb.from('locations').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); return; }
  logActivity('deleted', l ? `${l.clientName || '—'} — ${l.name}` : 'entry', '');
  closeModal(); toast('Deleted'); load();
}

/* --- Activity log ------------------------------------------------------------
   Every create/update/delete/opened writes one row here, tagged with the
   logged-in user's email. The Activity Log tab reads them back.            */
// Write a single log entry (best-effort: a logging failure never blocks the action).
async function logActivity(action, entity, details) {
  try {
    await sb.from('activity_log').insert({
      user_email: currentUser ? currentUser.email : 'unknown',
      action, entity, details
    });
  } catch (e) { console.warn('activity log failed', e); }
}
// Load the most recent log entries and draw them in the Activity Log table.
async function renderActivity() {
  const { data: rows, error } = await sb.from('activity_log')
    .select('*').order('created_at', { ascending: false }).limit(200);
  const tbody = document.getElementById('activityRows');
  if (error) { tbody.innerHTML = ''; document.getElementById('activityEmpty').textContent = 'Could not load activity: ' + error.message; document.getElementById('activityEmpty').style.display = 'block'; return; }
  document.getElementById('activityEmpty').style.display = rows.length ? 'none' : 'block';
  const ACTION_LABEL = { created:'Added', updated:'Edited', deleted:'Deleted', opened:'Marked opened' };
  tbody.innerHTML = rows.map(r => {
    const when = new Date(r.created_at).toLocaleString();
    return `<tr>
      <td><span style="white-space:nowrap">${esc(when)}</span></td>
      <td>${esc(ACTION_LABEL[r.action] || r.action)}</td>
      <td>${esc(r.entity || '')}${r.details ? `<div class="note-sub">${esc(r.details)}</div>` : ''}</td>
      <td>${esc(r.user_email || '')}</td>
    </tr>`;
  }).join('');
}

/* --- CSV export --------------------------------------------------------------
   Lets the user choose scope (active / opened / all), status, and tier,
   then downloads exactly that selection as a CSV. */
function openExportModal() {
  // Sensible defaults based on the tab you're currently on.
  document.getElementById('x-scope').value = currentView === 'opened' ? 'opened' : 'active';
  document.getElementById('x-status').value = '';
  document.getElementById('x-tier').value = '';
  updateExportCount();
  // Recount whenever a choice changes.
  ['x-scope','x-status','x-tier'].forEach(id => document.getElementById(id).onchange = updateExportCount);
  document.getElementById('exportOverlay').classList.add('open');
}
function closeExportModal() { document.getElementById('exportOverlay').classList.remove('open'); }

// Apply the chosen scope/status/tier to the full dataset and return the rows.
function getExportRows() {
  const scope = document.getElementById('x-scope').value;
  const st = document.getElementById('x-status').value;
  const tr = document.getElementById('x-tier').value;
  return data
    .filter(l => scope === 'all' ? true : scope === 'opened' ? l.status === 'opened' : l.status !== 'opened')
    .filter(l => !st || l.status === st)
    .filter(l => !tr || l.tier === tr)
    .sort((a,b) => (a.openingDate||'').localeCompare(b.openingDate||''));
}
// Show a live "N clients will be exported" count in the dialog.
function updateExportCount() {
  const n = getExportRows().length;
  document.getElementById('x-count').textContent = `${n} client${n===1?'':'s'} will be exported.`;
}
// Build and download the CSV for the current selection.
function runExport() {
  const rows = getExportRows();
  if (!rows.length) { alert('No clients match that selection.'); return; }
  const headers = ['Client','Location','Tier','Opening Date','Tracker','Status','Notes','Pre-open done','Post-open done','Actual open date','Open outcome'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;   // quote + escape for CSV
  const lines = [headers.join(',')];
  rows.forEach(l => lines.push([
    l.clientName, l.name, l.tier, l.openingDate, l.tracker, STATUS_LABELS[l.status] || l.status,
    l.notes, l.preOpenDone ? 'Yes' : 'No', l.postOpenDone ? 'Yes' : 'No', l.openedDate, l.openOutcome
  ].map(cell).join(',')));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `client-openings-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  closeExportModal(); toast('CSV downloaded');
}

// --- Misc + startup ----------------------------------------------------------
// Brief pop-up confirmation message at the bottom of the screen.
let toastT;
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2000); }

// Close each dialog when its dark backdrop (not the dialog itself) is clicked.
document.getElementById('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeModal(); });
document.getElementById('confirmOverlay').addEventListener('click', e => { if (e.target.id === 'confirmOverlay') closeConfirm(); });
document.getElementById('exportOverlay').addEventListener('click', e => { if (e.target.id === 'exportOverlay') closeExportModal(); });

// Startup: react to the current session, then to any login/logout afterwards.
sb.auth.getSession().then(({ data }) => handleAuth(data.session));
sb.auth.onAuthStateChange((_event, session) => handleAuth(session));
