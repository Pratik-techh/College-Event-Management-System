// Helper function to get CSRF token
function getCSRFToken() {
    // Try to get from form first
    const formToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (formToken) {
        return formToken.value;
    }

    // Fall back to cookie
    if (window.CSRF_TOKEN) {
        return window.CSRF_TOKEN;
    }
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : '';
}

let _allEvents = []; // Global cache for events

async function loadEvents() {
    const eventList = document.getElementById('event-list');
    const noEvents = document.getElementById('no-events');
    if (!eventList) return;

    // Remove skeleton loaders
    document.querySelectorAll('.skeleton-wrapper').forEach(el => el.remove());

    let events = [];
    let registeredEventIds = [];
    window.myRegistrations = [];

    try {
        // Load upcoming events
        const response = await fetch('/api/events/?filter=upcoming');
        if (response.ok) {
            const data = await response.json();
            events = data;
            window._allEvents = data;
        }

        // Load current user's registrations if logged in
        if (window.userLoggedIn) {
            const regResponse = await fetch('/api/user/registrations/');
            if (regResponse.ok) {
                const regData = await regResponse.json();
                registeredEventIds = regData.registered_event_ids || [];
                window.myRegistrations = regData.registrations || [];
            }
        }
    } catch (error) {
        console.warn('Error loading data from API:', error);
    }

    eventList.innerHTML = '';

    if (events.length === 0) {
        if (noEvents) noEvents.style.display = 'block';
        return;
    }

    events.forEach(function (event, index) {
        var countdownId = 'countdown-' + event.id;
        var isRegistered = registeredEventIds.includes(event.id);
        var registration = isRegistered ? window.myRegistrations.find(r => r.event_id === event.id) : null;

        var card = '<div class="col-md-4 mb-5 event-item"'
            + ' data-name="' + event.name.toLowerCase() + '"'
            + ' data-venue="' + event.venue.toLowerCase() + '"'
            + ' data-aos="fade-up" data-aos-delay="' + ((index % 3) * 100) + '">'
            + '<div class="event-card premium-glass-card shadow-hover">'

            // Image banner with overlay
            + '<div class="event-image-container">'
            + '<img src="' + fixUnsplashUrl(event.image) + '"'
            + '     alt="' + event.name + '"'
            + '     class="event-img-zoom">'
            + '<div class="event-overlay-gradient"></div>'
            + '<span class="event-status-pill">UPCOMING</span>'
            + (window.userIsStaff ? '<span class="admin-badge-pill"><i class="fas fa-shield-halved"></i> Admin Mode</span>' : '')
            + '</div>'

            // Card body
            + '<div class="card-body event-card-content">'
            + '<h5 class="event-title-premium">' + event.name + '</h5>'
            + '<p class="event-desc-premium">'
            + (event.description.length > 90 ? event.description.substring(0, 90) + '...' : event.description)
            + '</p>'

            // ── Countdown timer ──
            + '<div class="event-countdown-wrapper">'
            + '<div class="event-countdown" id="' + countdownId + '">⏳ Initializing...</div>'
            + '</div>'

            // Event Details Grid
            + '<div class="event-details-grid">'
            + '<div class="detail-item"><i class="fas fa-calendar-alt"></i> <span>' + formatDate(event.date) + '</span></div>'
            + (event.time ? '<div class="detail-item"><i class="fas fa-clock"></i> <span>' + formatTime(event.time) + '</span></div>' : '')
            + '<div class="detail-item"><i class="fas fa-map-marker-alt"></i> <span>' + event.venue + '</span></div>'
            + '</div>'

            // Primary Action
            + (isRegistered ?
                '<div class="action-stack">'
                + '<button class="btn btn-registered-success w-100">'
                + '<i class="fas fa-check-circle mr-2"></i> Registered'
                + '</button>'
                + '<button class="btn btn-edit-premium w-100 mt-2 btn-edit-info" '
                + '        data-reg-id="' + registration.id + '"'
                + '        data-event-id="' + event.id + '">'
                + '<i class="fas fa-pen-nib mr-2"></i> Modify details'
                + '</button>'
                + '</div>'
                :
                '<button class="btn btn-register-premium w-100 register-btn"'
                + '        data-event-id="' + event.id + '">'
                + '<i class="fas fa-bolt mr-2"></i> Register Now'
                + '</button>'
            )

            // Admin Secondary Actions (Side-by-Side)
            + (window.userIsStaff ?
                '<div class="admin-action-group">'
                + '<button class="btn-admin-tool update" onclick="editEvent(' + event.id + ')" title="Update Event">'
                + '<i class="fas fa-pen-to-square"></i> Update'
                + '</button>'
                + '<button class="btn-admin-tool delete" onclick="deleteEvent(' + event.id + ')" title="Delete Event">'
                + '<i class="fas fa-trash-can"></i> Delete'
                + '</button>'
                + '</div>'
                : '')

            + '</div></div></div>';

        eventList.innerHTML += card;

        // Start countdown after the card is injected
        if (window.startCountdown) {
            setTimeout(function () {
                startCountdown(countdownId, event.date);
            }, 50 * (index + 1));
        }
    });

    // Re-initialise AOS for dynamically added cards
    if (window.AOS) AOS.refresh();

    // Live search filtering
    const searchInput = document.getElementById('eventSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = this.value.toLowerCase();
            document.querySelectorAll('.event-item').forEach(item => {
                const match = item.dataset.name.includes(q) || item.dataset.venue.includes(q);
                item.style.display = match ? '' : 'none';
            });
            const visible = document.querySelectorAll('.event-item[style=""]');
            if (noEvents) noEvents.style.display = visible.length === 0 ? 'block' : 'none';
        });
    }
}


function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function formatTime(timeStr) {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function fixUnsplashUrl(url) {
    if (!url) return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800';

    // If it's a direct Unsplash image URL or already formatted, leave it
    if (url.includes('images.unsplash.com')) return url;

    // If it's an Unsplash photo page link (e.g., https://unsplash.com/photos/...)
    if (url.includes('unsplash.com/photos/')) {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        const photoId = lastPart.includes('-') ? lastPart.split('-').pop() : lastPart;
        return `https://unsplash.com/photos/${photoId}/download?force=true&w=800`;
    }

    return url;
}

function registerForEvent(eventId) {
    console.log('Opening registration modal for event:', eventId);
    const modal = $('#registrationModal');
    const form = document.getElementById('registrationForm');
    if (!form) return;

    // Reset to register mode
    form.reset();
    form.onsubmit = submitRegistration;
    form.dataset.updateMode = 'false';
    const emailField = document.getElementById('reg_email');
    if (emailField) {
        emailField.readOnly = false;
        emailField.removeAttribute('readonly');
    }

    modal.find('.modal-title').html('<i class="fas fa-ticket-alt mr-2"></i> Register for Event');
    modal.find('button[type="submit"]').text('Register Now').removeClass('btn-primary').addClass('btn-success');

    // Hide auto-fill badge if it exists (will be re-added by fetchStudentProfile)
    const badge = document.getElementById('autoFillBadge');
    if (badge) badge.remove();

    document.getElementById('selectedEventId').value = eventId;
    modal.modal('show');
}

async function submitRegistration(event) {
    event.preventDefault();
    console.log('Form submission started...');

    const form = event.target;
    const errorDisplay = document.getElementById('registrationError');

    try {
        errorDisplay.classList.add('d-none');
        errorDisplay.textContent = '';

        const eventId = document.getElementById('selectedEventId').value;
        const studentName = document.getElementById('studentName').value.trim();
        const emailField = document.getElementById('reg_email');
        const email = emailField ? emailField.value.trim() : '';
        const mobile = form.mobile.value.trim();
        const course = form.course.value.trim();
        const branch = form.branch.value.trim();

        console.log('Submitting registration for event:', eventId);
        console.log('Student name:', studentName);

        // Validate mobile number
        if (!/^\d{10}$/.test(mobile)) {
            throw new Error('Please enter a valid 10-digit mobile number.');
        }

        // Prepare form data to send to Django backend
        const formData = new FormData();
        formData.append('name', studentName);
        formData.append('email', email);
        formData.append('mobile', mobile);
        formData.append('course', course);
        formData.append('branch', branch);
        formData.append('csrfmiddlewaretoken', getCSRFToken());

        console.log('Sending request to /register/' + eventId + '/');

        // Submit to Django backend
        const response = await fetch(`/register/${eventId}/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        console.log('Response redirected:', response.redirected);

        if (response.ok || response.redirected) {
            // Registration successful
            $('#registrationModal').modal('hide');

            // Show success message with SweetAlert
            Swal.fire({
                icon: 'success',
                title: 'Registration Successful!',
                text: 'You have been registered for this event.',
                confirmButtonColor: '#007bff'
            }).then(() => {
                // Reload page to show updated registration count
                window.location.reload();
            });
        } else {
            const text = await response.text();
            console.error('Registration failed. Response:', text);

            // Check if response contains error message
            if (text.includes('already registered')) {
                throw new Error('You have already registered for this event.');
            } else {
                throw new Error('Registration failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Error during registration:', error);
        errorDisplay.textContent = error.message;
        errorDisplay.classList.remove('d-none');
    }
}

/* ══════════════════════════════════════════════════════════════
   ADMIN CRUD OPERATIONS (for side-by-side buttons)
   ══════════════════════════════════════════════════════════════ */

function editEvent(eventId) {
    const event = window._allEvents.find(e => e.id == eventId);
    if (!event) return;

    const modal = $('#eventModal');
    if (!modal.length) return;

    document.getElementById('eventId').value = event.id;
    document.getElementById('eventName').value = event.name;
    document.getElementById('eventVenue').value = event.venue;
    document.getElementById('eventDescription').value = event.description;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventImage').value = event.image || '';

    modal.modal('show');
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

    try {
        const response = await fetch(`/api/events/${id}/update/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            $('#eventModal').modal('hide');
            Swal.fire({
                icon: 'success',
                title: 'Event Updated!',
                text: 'The event details have been successfully updated.',
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: '#6366f1'
            }).then(() => loadEvents());
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: result.error || 'Failed to update event.',
                confirmButtonColor: '#6366f1'
            });
        }
    } catch (error) {
        console.error('Error updating event:', error);
        Swal.fire('Error', 'An unexpected error occurred while saving.', 'error');
    }
}

async function deleteEvent(eventId) {
    const result = await Swal.fire({
        title: 'Delete Event?',
        text: "This will permanently remove the event and all associated registrations. This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/events/${eventId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'The event has been successfully removed.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => loadEvents());
            } else {
                Swal.fire('Error', data.error || 'Failed to delete event.', 'error');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            Swal.fire('Error', 'An unexpected error occurred during deletion.', 'error');
        }
    }
}

async function updateExistingRegistration(event) {
    event.preventDefault();
    const form = event.target;
    const regId = form.dataset.regId;
    const errorDisplay = document.getElementById('registrationError');

    try {
        errorDisplay.classList.add('d-none');
        const formData = new FormData();
        formData.append('name', form.studentName.value.trim());
        const emailField = document.getElementById('reg_email');
        if (emailField) {
            formData.append('email', emailField.value.trim());
        }
        formData.append('mobile', form.mobile.value.trim());
        formData.append('course', form.course.value.trim());
        formData.append('branch', form.branch.value.trim());
        formData.append('csrfmiddlewaretoken', getCSRFToken());

        const response = await fetch(`/accounts/registration/${regId}/update/`, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
            $('#registrationModal').modal('hide');
            Swal.fire({
                icon: 'success',
                title: 'Info Updated!',
                text: 'Your registration details have been updated.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload();
            });
        } else {
            const text = await response.text();
            throw new Error(text || 'Update failed');
        }
    } catch (error) {
        errorDisplay.textContent = error.message;
        errorDisplay.classList.remove('d-none');
    }
}

// Global registry for edit info buttons
$(document).on('click', '.btn-edit-info', function () {
    const regId = $(this).data('reg-id');
    const eventId = $(this).data('event-id');

    // Find the registration data
    const reg = window.myRegistrations.find(r => r.id == regId);
    if (!reg) return;

    // Repurpose registration modal
    const modal = $('#registrationModal');
    modal.find('.modal-title').html('<i class="fas fa-edit mr-2"></i> Edit Registration Info');
    modal.find('button[type="submit"]').text('Save Changes');

    const form = document.getElementById('registrationForm');
    form.dataset.updateMode = 'true';
    form.dataset.regId = regId;

    // Fill fields
    form.studentName.value = reg.name;
    const emailField = document.getElementById('reg_email');
    if (emailField) {
        emailField.value = reg.email;
        emailField.readOnly = false;
        emailField.removeAttribute('readonly');
    }
    form.mobile.value = reg.mobile;
    form.course.value = reg.course;
    form.branch.value = reg.branch;

    // Change onsubmit
    form.onsubmit = updateExistingRegistration;

    modal.modal('show');
});


function generateTicketId() {
    const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ticketId = '';
    for (let i = 0; i < 12; i++) {
        ticketId += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
    }
    return ticketId;
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email sending removed - configure Django email backend if needed
// function sendConfirmationEmail(registration, eventId) {
//     // TO ENABLE: Configure Django email settings in settings.py
//     // OR configure EmailJS with valid service ID and template ID
// }

// Registration count now handled by Django backend
// function updateRegistrationCount(eventId) {
//     // Event registration counts are now tracked in the database
//     // and displayed via Django template context
// }

function verifyTicket(ticketId, verificationCode) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    for (const registration of registrations) {
        if (registration.ticketId === ticketId && registration.verificationCode === verificationCode) {
            registration.registrationStatus = 'verified';
            localStorage.setItem('registrations', JSON.stringify(registrations));
            return {
                valid: true,
                message: 'Ticket verified successfully',
                registration: registration
            };
        }
    }

    return {
        valid: false,
        message: 'Invalid ticket or verification code'
    };
}

function generateTicket(registration, eventId) {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const event = events.find(e => e.id === eventId);

    if (event) {
        const ticketHtml = `
            <div class="ticket">
                <div class="ticket-content">
                    <div class="ticket-left">
                        <div class="logo">
                            <h4>College<span>Events</span></h4>
                        </div>
                        
                        <div class="event-name">
                            <h5>${event.name}</h5>
                        </div>
                        
                        <div class="details">
                            <div class="details-section">
                                <p><strong>Event Details</strong></p>
                                <p><i class="far fa-calendar-alt"></i> ${formatDate(event.date)}</p>
                                <p><i class="far fa-clock"></i> ${formatTime(event.time)}</p>
                                <p><i class="fas fa-map-marker-alt"></i> ${event.venue}</p>
                            </div>
                            
                            <div class="details-section">
                                <p><strong>Attendee Details</strong></p>
                                <p><i class="far fa-user"></i> ${registration.studentName}</p>
                                <p><i class="fas fa-graduation-cap"></i> ${registration.course}</p>
                                <p><i class="fas fa-code-branch"></i> ${registration.branch}</p>
                                <p><i class="fas fa-phone-alt"></i> ${registration.mobile}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ticket-right">
                        <div class="qr-code" id="qrcode"></div>
                        <div class="ticket-id">
                            <strong>Ticket ID</strong>
                            ${registration.ticketId}
                        </div>
                    </div>
                </div>
                
                <div class="corner-circle-top corner-circles"></div>
                <div class="corner-circle-bottom corner-circles"></div>
            </div>
        `;

        document.getElementById('ticketPreview').innerHTML = ticketHtml;

        const qrcode = new QRCode(document.getElementById("qrcode"), {
            text: registration.ticketId,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        $('#ticketModal').modal('show');
    }
}

function downloadTicket() {
    const ticketElement = document.getElementById('ticketPreview');

    setTimeout(() => {
        html2canvas(ticketElement, {
            scale: 2,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'event-ticket.png';
            link.href = image;
            link.click();
        });
    }, 100);
}

// Initialize default events if none exist
function initializeDefaultEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];

    if (events.length === 0) {
        const defaultEvents = [
            {
                id: 'evt1',
                name: 'Annual Tech Symposium',
                description: 'A day-long technical symposium featuring workshops, coding competitions, and tech talks.',
                date: '2025-01-15',
                time: '09:00',
                venue: 'Main Auditorium',
                image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800',
                capacity: 200
            },
            {
                id: 'evt2',
                name: 'Cultural Fest 2025',
                description: 'Annual cultural festival with music, dance, and theatrical performances.',
                date: '2025-02-20',
                time: '10:00',
                venue: 'College Ground',
                image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800',
                capacity: 500
            },
            {
                id: 'evt3',
                name: 'Winter Sports Meet',
                description: 'Inter-college sports competition featuring various indoor and outdoor games.',
                date: '2025-10-05',
                time: '08:00',
                venue: 'Sports Complex',
                image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800',
                capacity: 300
            },
            {
                id: 'evt4',
                name: 'Career Fair 2025',
                description: 'Connect with top companies and explore career opportunities.',
                date: '2025-03-10',
                time: '11:00',
                venue: 'Conference Center',
                image: 'https://images.unsplash.com/photo-1560523159-4a9692d222ef?auto=format&fit=crop&w=800',
                capacity: 400
            },
            {
                id: 'evt5',
                name: 'New Year Celebration',
                description: 'Welcome 2025 with music, food, and festivities.',
                date: '2025-01-01',
                time: '20:00',
                venue: 'College Ground',
                image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=800',
                capacity: 1000
            },
            {
                id: 'evt6',
                name: 'AI & Machine Learning Workshop',
                description: 'Hands-on workshop on artificial intelligence and machine learning fundamentals.',
                date: '2025-02-28',
                time: '14:00',
                venue: 'Computer Lab Complex',
                image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800',
                capacity: 100
            },
            {
                id: 'evt7',
                name: 'Alumni Meet 2025',
                description: 'Annual gathering of college alumni sharing experiences and networking.',
                date: '2025-01-25',
                time: '16:00',
                venue: 'College Banquet Hall',
                image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800',
                capacity: 250
            },
            {
                id: 'evt8',
                name: 'Environmental Awareness Drive',
                description: 'Campus-wide initiative for environmental conservation and sustainability.',
                date: '2025-03-22',
                time: '09:30',
                venue: 'Botanical Garden',
                image: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=800',
                capacity: 150
            },
            {
                id: 'evt9',
                name: 'Entrepreneurship Summit',
                description: 'Meet successful entrepreneurs and learn about startup opportunities.',
                date: '2025-04-05',
                time: '10:00',
                venue: 'Business School Auditorium',
                image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800',
                capacity: 300
            },
            {
                id: 'evt10',
                name: 'Spring Music Festival',
                description: 'A day of live music performances featuring college bands and professional artists.',
                date: '2025-03-15',
                time: '17:00',
                venue: 'Open Air Theater',
                image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800',
                capacity: 600
            }
        ];

        localStorage.setItem('events', JSON.stringify(defaultEvents));
    }
}

// ══════════════════════════════════════════════════════════════
// DOMContentLoaded — wire everything up
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {

    // ── Page Progress Bar ─────────────────────────────────────
    var bar = document.getElementById('pageProgress');
    if (bar) {
        bar.style.width = '40%';               // jump to 40% immediately
        setTimeout(function () {
            bar.style.width = '70%';           // simulate loading
        }, 200);
        setTimeout(function () {
            bar.style.width = '100%';          // complete
            setTimeout(function () {
                bar.style.opacity = '0';
                bar.style.transition = 'width 0.4s ease, opacity 0.5s ease';
            }, 400);
        }, 700);
    }

    // ── Scroll-to-Top Button ──────────────────────────────────
    var scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                scrollBtn.style.opacity = '1';
                scrollBtn.style.transform = 'translateY(0) scale(1)';
            } else {
                scrollBtn.style.opacity = '0';
                scrollBtn.style.transform = 'translateY(20px) scale(0.8)';
            }
        });
    }

    // ── Toast click-to-dismiss ────────────────────────────────
    document.addEventListener('click', function (e) {
        var toast = e.target.closest('.toast-msg');
        if (toast) {
            toast.style.transition = 'opacity 0.25s, transform 0.25s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(80px)';
            setTimeout(function () { toast.remove(); }, 260);
        }
    });

    // ── Hamburger aria-expanded watcher ──────────────────────
    // Bootstrap 4 updates aria-expanded automatically; CSS reads it.
    // Nothing extra needed.

    // ── Auto-fill registration modal from student profile ────
    // Fetches /api/user/profile/ once and stores result.
    // When the modal opens (openRegistrationModal called), fills fields.
    var _cachedProfile = null;

    function fetchStudentProfile() {
        if (_cachedProfile !== null) return Promise.resolve(_cachedProfile);
        return fetch('/api/user/profile/')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                _cachedProfile = data;
                return data;
            })
            .catch(function () {
                _cachedProfile = { authenticated: false };
                return _cachedProfile;
            });
    }

    function autoFillModal(profile) {
        if (!profile || !profile.authenticated) return;
        var fields = {
            studentName: profile.name,
            reg_email: profile.email,
            mobile: profile.mobile,
        };
        Object.keys(fields).forEach(function (id) {
            var el = document.getElementById(id);
            if (el && fields[id]) el.value = fields[id];
        });
        // Course and Branch: set select value
        ['course', 'branch'].forEach(function (id) {
            var sel = document.getElementById(id);
            if (sel && profile[id]) {
                for (var i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].value === profile[id]) {
                        sel.selectedIndex = i;
                        break;
                    }
                }
            }
        });
        // Show a subtle badge if auto-filled
        var badge = document.getElementById('autoFillBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'autoFillBadge';
            badge.style.cssText = [
                'background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(236,72,153,0.1))',
                'border:1px solid rgba(99,102,241,0.25)',
                'border-radius:10px',
                'padding:8px 14px',
                'font-size:13px',
                'color:#6366f1',
                'font-weight:600',
                'margin-bottom:16px',
                'display:flex',
                'align-items:center',
                'gap:8px'
            ].join(';');
            badge.innerHTML = '⚡ Auto-filled from your profile — <a href="/accounts/dashboard/" style="color:#ec4899;margin-left:4px;">edit profile</a>';
            var form = document.getElementById('registrationForm');
            if (form) form.insertBefore(badge, form.firstChild);
        }
    }

    // Pre-fetch profile as soon as page loads (for zero-delay auto-fill)
    fetchStudentProfile();

    // Hook into the register button click to trigger auto-fill on modal open
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('register-btn')) {
            var eventId = e.target.getAttribute('data-event-id');
            registerForEvent(eventId);
            // Auto-fill after a short delay (allow modal to open/render)
            setTimeout(function () {
                fetchStudentProfile().then(autoFillModal);
            }, 300);
        }
    });

    // ── Legacy: init default events + loadEvents ──────────────
    initializeDefaultEvents();
    loadEvents();
});

