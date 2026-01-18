// Authentication is now handled by Django @login_required decorator
// No need for client-side auth check

// Helper function to get CSRF token
function getCSRFToken() {
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : '';
}

let events = [];
let registrations = [];

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionName}-section`).style.display = 'block';

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Function to manually refresh registrations data
async function refreshRegistrations() {
    console.log('Refreshing registrations...');
    await loadRegistrations();
    await loadEvents(); // Reload events too to update counts
    alert('Registration data refreshed!');
}

async function loadEvents() {
    try {
        // Fetch events from Django API
        const response = await fetch('/api/events/');
        if (response.ok) {
            events = await response.json();
        } else {
            console.error('Failed to load events from API');
            events = [];
        }
    } catch (error) {
        console.error('Error loading events:', error);
        events = [];
    }

    const tableBody = document.getElementById('events-table-body');
    tableBody.innerHTML = '';

    events.forEach(event => {
        const registrationCount = registrations.filter(r => r.event__id === event.id).length;
        const row = `
            <tr>
                <td>${event.name}</td>
                <td>${event.date}</td>
                <td>${event.time || 'N/A'}</td>
                <td>${event.venue}</td>
                <td>${registrationCount}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="editEvent('${event.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

async function loadRegistrations() {
    try {
        // Fetch registrations from Django API
        const response = await fetch('/api/registrations/');
        if (response.ok) {
            registrations = await response.json();
            console.log('Registrations loaded from backend:', registrations.length);
        } else {
            console.error('Failed to load registrations from API');
            registrations = [];
        }
    } catch (error) {
        console.error('Error loading registrations:', error);
        registrations = [];
    }

    // Group registrations by event
    const eventGroups = {};
    registrations.forEach(reg => {
        const eventId = reg.event__id;
        if (!eventGroups[eventId]) {
            eventGroups[eventId] = {
                eventName: reg.event__name,
                eventDate: reg.event__date,
                eventVenue: reg.event__venue,
                registrations: []
            };
        }
        eventGroups[eventId].registrations.push(reg);
    });

    // Create tabs for each event
    const eventTabs = document.getElementById('eventTabs');
    const eventTabContent = document.getElementById('eventTabContent');

    if (eventTabs && eventTabContent) {
        eventTabs.innerHTML = '';
        eventTabContent.innerHTML = '';

        let firstTab = true;
        Object.keys(eventGroups).forEach(eventId => {
            const group = eventGroups[eventId];
            const tabId = `event-${eventId}-tab`;
            const contentId = `event-${eventId}-content`;

            // Create tab
            const tabLi = document.createElement('li');
            tabLi.className = 'nav-item';
            tabLi.innerHTML = `
                <a class="nav-link ${firstTab ? 'active' : ''}" id="${tabId}" data-toggle="tab" 
                   href="#${contentId}" role="tab">
                    ${group.eventName} (${group.registrations.length})
                </a>
            `;
            eventTabs.appendChild(tabLi);

            // Create tab content
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${firstTab ? 'show active' : ''}`;
            tabContent.id = contentId;
            tabContent.setAttribute('role', 'tabpanel');

            let tableHtml = `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Course</th>
                                <th>Branch</th>
                                <th>Registration Date</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            group.registrations.forEach(reg => {
                tableHtml += `
                    <tr>
                        <td>${reg.name}</td>
                        <td>${reg.email}</td>
                        <td>${reg.mobile}</td>
                        <td>${reg.course}</td>
                        <td>${reg.branch}</td>
                        <td>${reg.timestamp}</td>
                    </tr>
                `;
            });

            tableHtml += `
                        </tbody>
                    </table>
                </div>
            `;

            tabContent.innerHTML = tableHtml;
            eventTabContent.appendChild(tabContent);

            firstTab = false;
        });

        // Show message if no registrations
        if (Object.keys(eventGroups).length === 0) {
            eventTabContent.innerHTML = '<p class="text-muted">No registrations found.</p>';
        }
    }
}

function showEventModal(eventId = null) {
    const modal = $('#eventModal');
    const modalTitle = document.getElementById('eventModalLabel');
    const form = document.getElementById('eventForm');

    if (eventId) {
        const event = events.find(e => e.id == eventId);
        if (event) {
            modalTitle.textContent = 'Edit Event';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventName').value = event.name;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventVenue').value = event.venue;
            document.getElementById('eventImage').value = event.image || '';
        }
    } else {
        modalTitle.textContent = 'Add New Event';
        form.reset();
        document.getElementById('eventId').value = '';
    }

    modal.modal('show');
}

async function saveEvent() {
    const form = document.getElementById('eventForm');
    if (form.checkValidity()) {
        const eventId = document.getElementById('eventId').value;
        const eventData = {
            name: document.getElementById('eventName').value,
            description: document.getElementById('eventDescription').value,
            date: document.getElementById('eventDate').value,
            venue: document.getElementById('eventVenue').value,
            image: document.getElementById('eventImage').value || ''
        };
        // Note: time field removed as Event model doesn't have it

        try {
            let response;
            if (eventId) {
                // Update existing event
                response = await fetch(`/api/events/${eventId}/update/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify(eventData)
                });
            } else {
                // Create new event
                response = await fetch('/api/events/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify(eventData)
                });
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    $('#eventModal').modal('hide');
                    await loadEvents();
                    alert(eventId ? 'Event updated successfully!' : 'Event created successfully!');
                } else {
                    alert('Error: ' + result.error);
                }
            } else {
                alert('Failed to save event. Please try again.');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            alert('An error occurred while saving the event.');
        }
    } else {
        form.reportValidity();
    }
}

async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            const response = await fetch(`/api/events/${eventId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    await loadEvents();
                    alert('Event deleted successfully!');
                } else {
                    alert('Error: ' + result.error);
                }
            } else {
                alert('Failed to delete event. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('An error occurred while deleting the event.');
        }
    }
}

function editEvent(eventId) {
    showEventModal(eventId);
}

function logout() {
    // Redirect to Django logout view
    window.location.href = '/admin-logout/';
}

let html5QrcodeScanner = null;

document.getElementById('startScanner').addEventListener('click', function () {
    const html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            document.getElementById('startScanner').classList.add('d-none');
            document.getElementById('stopScanner').classList.remove('d-none');
            html5QrcodeScanner = html5QrCode;
        })
        .catch(err => {
            alert('Error starting scanner: ' + err);
        });
});

document.getElementById('stopScanner').addEventListener('click', function () {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => {
                document.getElementById('startScanner').classList.remove('d-none');
                document.getElementById('stopScanner').classList.add('d-none');
                document.getElementById('scanResult').classList.add('d-none');
                html5QrcodeScanner = null;
            })
            .catch(err => {
                alert('Error stopping scanner: ' + err);
            });
    }
});

function onScanSuccess(ticketId) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    const registration = registrations.find(r => r.ticketId === ticketId);

    const resultDiv = document.getElementById('scanResult');
    const resultDetails = document.getElementById('resultDetails');
    resultDiv.classList.remove('d-none');

    if (registration) {
        const events = JSON.parse(localStorage.getItem('events')) || [];
        const event = events.find(e => e.id === registration.eventId);

        resultDiv.querySelector('.alert').className = 'alert alert-success';
        resultDetails.innerHTML = `
            <p class="mb-1"><strong>Status:</strong> <span class="badge badge-success">Valid Ticket</span></p>
            <p class="mb-1"><strong>Event:</strong> ${event ? event.name : 'N/A'}</p>
            <p class="mb-1"><strong>Attendee:</strong> ${registration.studentName}</p>
            <p class="mb-1"><strong>Course:</strong> ${registration.course}</p>
            <p class="mb-1"><strong>Branch:</strong> ${registration.branch}</p>
            <p class="mb-1"><strong>Mobile:</strong> ${registration.mobile}</p>
            <p class="mb-0"><strong>Ticket ID:</strong> ${registration.ticketId}</p>
        `;
    } else {
        resultDiv.querySelector('.alert').className = 'alert alert-danger';
        resultDetails.innerHTML = `
            <p class="mb-1"><strong>Status:</strong> <span class="badge badge-danger">Invalid Ticket</span></p>
            <p class="mb-0">This ticket ID (${ticketId}) is not found in the system.</p>
        `;
    }

    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => {
                document.getElementById('startScanner').classList.remove('d-none');
                document.getElementById('stopScanner').classList.add('d-none');
                html5QrcodeScanner = null;
            });
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    // Load registrations first, then events, so registration counts are accurate
    await loadRegistrations();
    await loadEvents();

    const scannerTab = document.getElementById('scanner-tab');
    if (scannerTab) {
        scannerTab.addEventListener('click', function () {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.stop().then(() => {
                    document.getElementById('startScanner').classList.remove('d-none');
                    document.getElementById('stopScanner').classList.add('d-none');
                    document.getElementById('scanResult').classList.add('d-none');
                    html5QrcodeScanner = null;
                });
            }
        });
    }
});
