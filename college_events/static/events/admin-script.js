// Utility: Get CSRF Token for POST requests
function getCSRFToken() {
    return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
}

let events = [];
window.registrations = [];
let registrations = window.registrations;

// ── Application State & Section Management ──
function showSection(sectionName, element = null) {
    // 1. Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');

    // 2. Show target section
    const target = document.getElementById(`${sectionName}-section`);
    if (target) target.style.display = 'block';

    // 3. Update Sidebar Active State
    if (element) {
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
        element.classList.add('active');
    }

    // 4. Update Header Title
    const titles = {
        'dashboard': 'Overview',
        'events': 'Manage Events',
        'registrations': 'Registrations',
        'scanner': 'Ticket Scanner'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Admin Panel';

    // 5. If mobile, close sidebar after clicking
    if (window.innerWidth <= 1024) {
        document.body.classList.remove('sidebar-active');
    }
}

// ── Data Loading & API Calls ──
async function loadEvents() {
    try {
        const response = await fetch('/api/events/');
        if (response.ok) {
            events = await response.json();
            renderEventsTable();
            updateStatsCounts();
        }
    } catch (error) {
        console.error('Events load error:', error);
    }
}

async function loadRegistrations() {
    try {
        const response = await fetch('/api/registrations/');
        if (response.ok) {
            const data = await response.json();
            registrations = data;
            window.registrations = data;
            renderRegistrationsSection();
            renderRecentActivity();
            updateStatsCounts();
            updateNotifBadge();
        }
    } catch (error) {
        console.error('Registrations load error:', error);
    }
}

async function refreshRegistrations() {
    await loadRegistrations();
    await loadEvents();
    // Subtle notification or toast could be added here
}

function updateStatsCounts() {
    const evCount = document.getElementById('count-events');
    const regCount = document.getElementById('count-registrations');

    if (evCount) evCount.textContent = events.length;
    if (regCount) regCount.textContent = registrations.length;
}

// ── Rendering Functions ──
function renderEventsTable() {
    const tableBody = document.getElementById('events-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = events.map(event => {
        const regCount = registrations.filter(r => r.event__id === event.id).length;
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${event.image || 'https://via.placeholder.com/100'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;margin-right:12px;">
                        <span class="font-weight-bold">${event.name}</span>
                    </div>
                </td>
                <td>
                    <div style="font-size:13px;color:#64748b;"><i class="fas fa-calendar mr-2"></i>${event.date}</div>
                    <div style="font-size:13px;color:#64748b;"><i class="fas fa-location-dot mr-2"></i>${event.venue}</div>
                </td>
                <td>
                    <span class="badge badge-pill" style="background:#6366f115;color:#6366f1;padding:6px 14px;font-weight:700;">
                        ${regCount} Registered
                    </span>
                </td>
                <td>
                    <button class="btn-icon-action btn-edit" onclick="editEvent(${event.id})" title="Edit">
                        <i class="fas fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon-action btn-delete" onclick="deleteEvent(${event.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderRecentActivity() {
    const recentBody = document.getElementById('recent-regs-dashboard');
    if (!recentBody) return;

    // Get last 5 registrations
    const recent = registrations.slice(0, 5);

    recentBody.innerHTML = recent.length ? recent.map(reg => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div style="width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-right:12px;font-weight:700;font-size:11px;">
                        ${reg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:700;">${reg.name}</div>
                        <div style="font-size:11px;color:#94a3b8;">${reg.email}</div>
                    </div>
                </div>
            </td>
            <td><span style="font-size:13px;">${reg.event__name}</span></td>
            <td style="font-size:13px;color:#64748b;">${new Date(reg.timestamp).toLocaleDateString()}</td>
            <td><span class="badge badge-success" style="font-size:10px;padding:4px 8px;">VERIFIED</span></td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="text-center p-4">No recent activity</td></tr>';
}

function renderRegistrationsSection() {
    const eventTabs = document.getElementById('eventTabs');
    const eventTabContent = document.getElementById('eventTabContent');
    if (!eventTabs || !eventTabContent) return;

    // Group by Event
    const groups = registrations.reduce((acc, reg) => {
        const eid = reg.event__id;
        if (!acc[eid]) acc[eid] = { name: reg.event__name, list: [] };
        acc[eid].list.push(reg);
        return acc;
    }, {});

    const eventIds = Object.keys(groups);

    if (!eventIds.length) {
        eventTabContent.innerHTML = `<div class="text-center p-5"><i class="fas fa-users-slash mb-3" style="font-size:40px;color:#cbd5e1;"></i><p>No attendees yet.</p></div>`;
        return;
    }

    // Render Pills
    eventTabs.innerHTML = eventIds.map((eid, idx) => `
        <li class="nav-item">
            <a class="nav-link ${idx === 0 ? 'active' : ''}" id="tab-${eid}" data-toggle="pill" href="#tab-content-${eid}">
                ${groups[eid].name} (${groups[eid].list.length})
            </a>
        </li>
    `).join('');

    // Render Tab Panes
    eventTabContent.innerHTML = eventIds.map((eid, idx) => `
        <div class="tab-pane fade ${idx === 0 ? 'show active' : ''}" id="tab-content-${eid}">
            <div class="table-responsive">
                <table class="table table-admin-sleek">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Contact</th>
                            <th>Academic</th>
                            <th>Ticket ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groups[eid].list.map(r => `
                            <tr>
                                <td><div class="font-weight-bold">${r.name}</div><div style="font-size:11px;color:#94a3b8;">Ref: #${r.id}</div></td>
                                <td><div>${r.email}</div><div style="font-size:11px;color:#64748b;">${r.mobile}</div></td>
                                <td><div>${r.course}</div><div style="font-size:11px;color:#64748b;">${r.branch}</div></td>
                                <td><code class="p-1 bg-light rounded">${r.ticket_id}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

// ── CRUD Operations ──
function showEventModal(eventId = null) {
    const form = document.getElementById('eventForm');
    const title = document.getElementById('eventModalLabel');
    const hiddenId = document.getElementById('eventId');

    if (eventId) {
        const ev = events.find(e => e.id == eventId);
        if (ev) {
            title.textContent = 'Edit Event Details';
            hiddenId.value = ev.id;
            document.getElementById('eventName').value = ev.name;
            document.getElementById('eventVenue').value = ev.venue;
            document.getElementById('eventDescription').value = ev.description;
            document.getElementById('eventDate').value = ev.date;
            document.getElementById('eventImage').value = ev.image || '';
        }
    } else {
        title.textContent = 'Create New Event';
        form.reset();
        hiddenId.value = '';
    }
    $('#eventModal').modal('show');
}

async function saveEvent() {
    const form = document.getElementById('eventForm');
    if (!form.checkValidity()) return form.reportValidity();

    const id = document.getElementById('eventId').value;
    const data = {
        name: document.getElementById('eventName').value,
        venue: document.getElementById('eventVenue').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        image: document.getElementById('eventImage').value
    };

    const url = id ? `/api/events/${id}/update/` : '/api/events/create/';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            $('#eventModal').modal('hide');
            loadEvents();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) { console.error(e); }
}

async function deleteEvent(id) {
    if (!confirm('Are you certain you want to remove this event? All associated registrations will be affected.')) return;
    try {
        const res = await fetch(`/api/events/${id}/delete/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        });
        const result = await res.json();
        if (result.success) loadEvents();
    } catch (e) { console.error(e); }
}

function editEvent(id) { showEventModal(id); }

function logout() { window.location.href = '/admin-logout/'; }

// ── QR Scanner Logic ──
let html5QrCode = null;

document.getElementById('startScanner').addEventListener('click', async function () {
    html5QrCode = new Html5Qrcode("reader");
    const placeholder = document.getElementById('scannerPlaceholder');

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            onScanSuccess
        );
        placeholder.style.display = 'none';
        document.getElementById('startScanner').classList.add('d-none');
        document.getElementById('stopScanner').classList.remove('d-none');
    } catch (err) {
        alert('Scanner Camera Error: ' + err);
    }
});

document.getElementById('stopScanner').addEventListener('click', stopActiveScanner);

async function stopActiveScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            document.getElementById('scannerPlaceholder').style.display = 'flex';
            document.getElementById('startScanner').classList.remove('d-none');
            document.getElementById('stopScanner').classList.add('d-none');
            document.getElementById('scanResult').classList.add('d-none');
            html5QrCode = null;
        } catch (e) { }
    }
}

function onScanSuccess(ticketId) {
    // Search in the live registrations array
    const registration = registrations.find(r => r.ticket_id === ticketId);
    const resultDiv = document.getElementById('scanResult');
    resultDiv.classList.remove('d-none');

    if (registration) {
        resultDiv.className = 'scan-result-overlay result-valid';
        resultDiv.innerHTML = `
            <div class="d-flex align-items-center mb-3">
                <i class="fas fa-circle-check mr-2 text-success" style="font-size:24px;"></i>
                <h4 class="m-0 text-success">Valid Ticket</h4>
            </div>
            <div class="row">
                <div class="col-6 mb-2"><small class="text-muted d-block uppercase">Attendee</small><strong>${registration.name}</strong></div>
                <div class="col-6 mb-2"><small class="text-muted d-block uppercase">Event</small><strong>${registration.event__name}</strong></div>
                <div class="col-12"><small class="text-muted d-block uppercase">Ticket ID</small><strong>${ticketId}</strong></div>
            </div>
        `;
    } else {
        resultDiv.className = 'scan-result-overlay result-invalid';
        resultDiv.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <i class="fas fa-circle-xmark mr-2 text-danger" style="font-size:24px;"></i>
                <h4 class="m-0 text-danger">Invalid Ticket</h4>
            </div>
            <p class="mb-0 text-muted">No registration found for ID: <code>${ticketId}</code></p>
        `;
    }
}

// ── Initializers ──
document.addEventListener('DOMContentLoaded', () => {
    loadRegistrations();
    loadEvents();

    // Sidebar Toggle for Mobile
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-active');
        });
    }

    // Modal cleanup on hidden
    $('#eventModal').on('hidden.bs.modal', function () {
        document.getElementById('eventForm').reset();
    });

    // Close notification panel when clicking outside
    document.addEventListener('click', function (e) {
        const wrapper = document.getElementById('notifWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            closeNotifPanel();
        }
    });

    // Initialize Theme Icon
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcon(currentTheme);
});

// ── Theme Toggle ───────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (!icon) return;
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// ── Notification Bell ──────────────────────────────────────────
let notifCleared = false;
let notifPanelOpen = false;

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    notifPanelOpen = !notifPanelOpen;
    panel.style.display = notifPanelOpen ? 'block' : 'none';

    if (notifPanelOpen) {
        renderNotifications();
        // Mark as seen — hide badge
        const badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = 'none';
    }
}

function closeNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.style.display = 'none';
    notifPanelOpen = false;
}

function renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;

    const data = window.registrations || [];

    if (notifCleared || data.length === 0) {
        list.innerHTML = `<div class="notif-empty"><i class="fas fa-check-circle"></i> All caught up!</div>`;
        return;
    }

    // Show latest 10, newest first
    const recent = [...data].reverse().slice(0, 10);

    list.innerHTML = recent.map(reg => {
        const initials = (reg.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const eventName = reg.event__name || 'Event';
        const time = reg.timestamp ? reg.timestamp.split(' ')[0] : '';
        return `
            <div class="notif-item">
                <div class="notif-icon">${initials}</div>
                <div class="notif-content">
                    <div class="notif-title">${reg.name} registered</div>
                    <div class="notif-sub">${eventName}</div>
                    <div class="notif-time">${time} &nbsp;·&nbsp; ${reg.ticket_id}</div>
                </div>
            </div>`;
    }).join('');
}

function clearNotifications() {
    notifCleared = true;
    const list = document.getElementById('notifList');
    if (list) list.innerHTML = `<div class="notif-empty"><i class="fas fa-check-circle"></i> All caught up!</div>`;
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const count = (window.registrations || []).length;
    if (count > 0 && !notifCleared) {
        badge.style.display = 'block';
        badge.title = `${count} registration${count > 1 ? 's' : ''}`;
    } else {
        badge.style.display = 'none';
    }
}
