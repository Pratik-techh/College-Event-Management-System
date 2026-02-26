from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Event, Registration, StudentProfile
import json
import datetime
import random

def is_admin(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)

def homepage(request):
    """Landing homepage — hero, stats, features only. No event lists."""
    today = datetime.date.today()
    total_events = Event.objects.count()
    total_registrations = Registration.objects.count()
    upcoming_count = Event.objects.filter(date__gte=today).count()
    completed_count = Event.objects.filter(date__lt=today).count()
    # 3 featured upcoming events shown as a preview teaser
    featured_events = Event.objects.filter(date__gte=today).order_by('date')[:3]
    context = {
        'total_events': total_events,
        'total_registrations': total_registrations,
        'upcoming_count': upcoming_count,
        'completed_count': completed_count,
        'featured_events': featured_events,
    }
    return render(request, 'events/homepage.html', context)


def event_list(request):
    """Upcoming events page — shows only future events."""
    today = datetime.date.today()
    events = Event.objects.filter(date__gte=today).order_by('date')
    return render(request, 'events/event_list.html', {'events': events, 'page_title': 'Upcoming Events'})


def completed_events(request):
    """Completed events page — shows only past events."""
    today = datetime.date.today()
    events = Event.objects.filter(date__lt=today).order_by('-date')
    return render(request, 'events/completed_events.html', {'events': events})


def about(request):
    """About the college event management system."""
    return render(request, 'events/about.html')


def contact(request):
    """Contact page."""
    if request.method == 'POST':
        messages.success(request, 'Your message has been sent! We will get back to you soon.')
        return redirect('contact')
    return render(request, 'events/contact.html')

@require_http_methods(["GET", "POST"])
def register(request, event_id):
    """Register a student for a specific event via AJAX or form."""
    event = get_object_or_404(Event, id=event_id)

    if event.date < datetime.date.today():
        messages.error(request, 'Registration for this event is closed.')
        return redirect('event_list')

    if request.method == 'POST':
        name   = request.POST.get('name', '').strip()
        email  = request.POST.get('email', '').strip()
        mobile = request.POST.get('mobile', '').strip()
        course = request.POST.get('course', '').strip()
        branch = request.POST.get('branch', '').strip()

        if name and email and mobile and course and branch:
            if Registration.objects.filter(event=event, email=email).exists():
                messages.error(request, 'You have already registered for this event.')
                return render(request, 'events/register.html', {'event': event})

            if not mobile.isdigit() or len(mobile) != 10:
                messages.error(request, 'Please enter a valid 10-digit mobile number.')
                return render(request, 'events/register.html', {'event': event})

            # Link to student account if logged in
            linked_user = request.user if request.user.is_authenticated else None

            Registration.objects.create(
                event=event, user=linked_user,
                name=name, email=email,
                mobile=mobile, course=course, branch=branch
            )
            messages.success(request, 'Registration successful!')
            return redirect('event_list')
        else:
            messages.error(request, 'Please fill in all required fields.')

    return render(request, 'events/register.html', {'event': event})

@csrf_exempt  # TODO: REMOVE THIS - temporary for testing only
@require_http_methods(["GET", "POST"])
def admin_login_view(request):
    """Handle admin login using Django authentication."""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None and (user.is_staff or user.is_superuser):
            login(request, user)
            return redirect('admin_panel')
        else:
            messages.error(request, 'Invalid admin credentials.')
    
    return render(request, 'events/admin-login.html')

@user_passes_test(is_admin, login_url="/admin-login/")
def admin_panel(request):
    """Render the admin panel page after successful login."""
    registrations = Registration.objects.all().select_related('event').order_by('-timestamp')
    events = Event.objects.all()
    
    context = {
        'registrations': registrations,
        'events': events,
        'total_registrations': registrations.count(),
        'total_events': events.count(),
    }
    return render(request, 'events/admin-panel.html', context)

@user_passes_test(is_admin, login_url="/admin-login/")
def admin_logout_view(request):
    """Handle admin logout."""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('homepage')

@require_http_methods(["GET"])
def get_events_api(request):
    """JSON API endpoint to fetch events for frontend."""
    event_filter = request.GET.get('filter', 'all')  # 'upcoming', 'completed', or 'all'
    today = datetime.date.today()

    if event_filter == 'upcoming':
        events_qs = Event.objects.filter(date__gte=today).order_by('date')
    elif event_filter == 'completed':
        events_qs = Event.objects.filter(date__lt=today).order_by('-date')
    else:
        events_qs = Event.objects.all()

    events = events_qs.values('id', 'name', 'description', 'date', 'time', 'venue', 'image')
    events_list = list(events)
    
    # Convert date and time objects to strings for JSON serialization
    for event in events_list:
        event['date'] = event['date'].strftime('%Y-%m-%d')
        event['time'] = event['time'].strftime('%H:%M') if event['time'] else None
    
    response = JsonResponse(events_list, safe=False)
    # Prevent caching so we always get latest data
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

@login_required
@csrf_exempt
@require_http_methods(["POST"])
@user_passes_test(is_admin, login_url="/admin-login/")
def create_event_api(request):
    """API endpoint to create a new event."""
    try:
        data = json.loads(request.body)
        event = Event.objects.create(
            name=data['name'],
            description=data['description'],
            date=data['date'],
            time=data.get('time'),
            venue=data['venue'],
            image=data.get('image', '')
        )
        return JsonResponse({
            'success': True,
            'event': {
                'id': event.id,
                'name': event.name,
                'description': event.description,
                'date': event.date.strftime('%Y-%m-%d') if hasattr(event.date, 'strftime') else str(event.date),
                'time': event.time.strftime('%H:%M') if event.time and hasattr(event.time, 'strftime') else (str(event.time) if event.time else None),
                'venue': event.venue,
                'image': event.image
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@csrf_exempt
@require_http_methods(["PUT", "POST"])  # Allow POST for compatibility
@user_passes_test(is_admin, login_url="/admin-login/")
def update_event_api(request, event_id):
    """API endpoint to update an existing event."""
    try:
        event = get_object_or_404(Event, id=event_id)
        data = json.loads(request.body)
        
        event.name = data.get('name', event.name)
        event.description = data.get('description', event.description)
        event.date = data.get('date', event.date)
        event.time = data.get('time', event.time)
        event.venue = data.get('venue', event.venue)
        event.image = data.get('image', event.image)
        event.save()
        
        return JsonResponse({
            'success': True,
            'event': {
                'id': event.id,
                'name': event.name,
                'description': event.description,
                'date': event.date.strftime('%Y-%m-%d') if hasattr(event.date, 'strftime') else str(event.date),
                'time': event.time.strftime('%H:%M') if event.time and hasattr(event.time, 'strftime') else (str(event.time) if event.time else None),
                'venue': event.venue,
                'image': event.image
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@csrf_exempt
@require_http_methods(["DELETE", "POST"])  # Allow POST for compatibility  
@user_passes_test(is_admin, login_url="/admin-login/")
def delete_event_api(request, event_id):
    """API endpoint to delete an event."""
    try:
        event = get_object_or_404(Event, id=event_id)
        event.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@user_passes_test(is_admin)
@require_http_methods(["GET"])
def get_registrations_api(request):
    """JSON API endpoint to fetch all registrations for admin panel."""
    registrations = Registration.objects.all().select_related('event').values(
        'id', 'name', 'email', 'mobile', 'course', 'branch', 'timestamp',
        'event__id', 'event__name', 'event__date', 'event__venue'
    )
    registrations_list = list(registrations)

    for reg in registrations_list:
        reg['timestamp']   = reg['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        reg['event__date'] = reg['event__date'].strftime('%Y-%m-%d')
        # Generate a synthetic ticket ID for the scanner
        reg['ticket_id']   = f"CE-{reg['event__id']}-{reg['id']}"

    response = JsonResponse(registrations_list, safe=False)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


# ══════════════════════════════════════════════════════════════
# STUDENT ACCOUNT VIEWS
# ══════════════════════════════════════════════════════════════

AVATAR_COLORS = [
    '#6366f1', '#ec4899', '#8b5cf6', '#10b981',
    '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6',
]


@require_http_methods(["GET", "POST"])
def student_signup(request):
    """Student self-registration (account creation)."""
    if request.user.is_authenticated:
        return redirect('student_dashboard')

    if request.method == 'POST':
        first_name = request.POST.get('first_name', '').strip()
        last_name  = request.POST.get('last_name', '').strip()
        username   = request.POST.get('username', '').strip()
        email      = request.POST.get('email', '').strip()
        password1  = request.POST.get('password1', '')
        password2  = request.POST.get('password2', '')
        mobile     = request.POST.get('mobile', '').strip()
        course     = request.POST.get('course', '').strip()
        branch     = request.POST.get('branch', '').strip()
        year       = request.POST.get('year', '').strip()

        errors = []
        if not all([first_name, username, email, password1]):
            errors.append('Please fill in all required fields.')
        if password1 != password2:
            errors.append('Passwords do not match.')
        if len(password1) < 8:
            errors.append('Password must be at least 8 characters.')
        if User.objects.filter(username=username).exists():
            errors.append('Username already taken. Please choose another.')
        if User.objects.filter(email=email).exists():
            errors.append('An account with this email already exists.')
        if mobile and (not mobile.isdigit() or len(mobile) != 10):
            errors.append('Please enter a valid 10-digit mobile number.')

        if errors:
            for e in errors:
                messages.error(request, e)
        else:
            user = User.objects.create_user(
                username=username, email=email, password=password1,
                first_name=first_name, last_name=last_name
            )
            StudentProfile.objects.create(
                user=user, mobile=mobile, course=course,
                branch=branch, year=year,
                avatar_color=random.choice(AVATAR_COLORS)
            )
            login(request, user)
            messages.success(request, f'Welcome to CollegeEvents, {first_name}! 🎉')
            return redirect('student_dashboard')

    return render(request, 'events/student_signup.html')


@require_http_methods(["GET", "POST"])
def student_login_view(request):
    """Student login."""
    if request.user.is_authenticated:
        return redirect('student_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            next_url = request.GET.get('next', 'student_dashboard')
            messages.success(request, f'Welcome back, {user.first_name or user.username}! 👋')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid username or password.')

    return render(request, 'events/student_login.html')


@require_http_methods(["POST", "GET"])
def student_logout_view(request):
    """Student logout."""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('homepage')


@login_required(login_url='/accounts/login/')
def student_dashboard(request):
    """Student profile + registered events dashboard."""
    profile, _ = StudentProfile.objects.get_or_create(
        user=request.user,
        defaults={'avatar_color': random.choice(AVATAR_COLORS)}
    )
    my_registrations = Registration.objects.filter(
        user=request.user
    ).select_related('event').order_by('-timestamp')

    today = datetime.date.today()
    upcoming = [r for r in my_registrations if r.event.date >= today]
    completed = [r for r in my_registrations if r.event.date < today]

    # Add days remaining for upcoming events
    for r in upcoming:
        r.days_remaining = (r.event.date - today).days

    return render(request, 'events/student_dashboard.html', {
        'profile':   profile,
        'upcoming':  upcoming,
        'completed': completed,
        'total':     my_registrations.count(),
    })


@login_required(login_url='/accounts/login/')
@require_http_methods(["POST"])
def student_update_profile(request):
    """Update student profile via POST."""
    profile, _ = StudentProfile.objects.get_or_create(
        user=request.user,
        defaults={'avatar_color': random.choice(AVATAR_COLORS)}
    )
    user = request.user
    user.first_name = request.POST.get('first_name', user.first_name or '').strip()
    user.last_name  = request.POST.get('last_name', user.last_name or '').strip()
    user.email      = request.POST.get('email', user.email or '').strip()
    user.save()

    profile.mobile = request.POST.get('mobile', profile.mobile or '').strip()
    profile.course = request.POST.get('course', profile.course or '').strip()
    profile.branch = request.POST.get('branch', profile.branch or '').strip()
    profile.year   = request.POST.get('year', profile.year or '').strip()
    profile.bio    = request.POST.get('bio', profile.bio or '').strip()
    profile.save()

    messages.success(request, 'Profile updated successfully! ✅')
    return redirect('student_dashboard')


@require_http_methods(["GET"])
def student_profile_api(request):
    """Return logged-in student profile as JSON — used to auto-fill registration modal."""
    if not request.user.is_authenticated:
        return JsonResponse({'authenticated': False})

    user = request.user
    try:
        profile = user.student_profile
    except StudentProfile.DoesNotExist:
        profile = None

    return JsonResponse({
        'authenticated': True,
        'name':   user.get_full_name() or user.username,
        'email':  user.email,
        'mobile': profile.mobile if profile else '',
        'course': profile.course if profile else '',
        'branch': profile.branch if profile else '',
        'year':   profile.year   if profile else '',
    })


@require_http_methods(["GET"])
def api_check_registration(request):
    """Check if the logged-in user is already registered for an event."""
    event_id = request.GET.get('event_id')
    if not request.user.is_authenticated or not event_id:
        return JsonResponse({'registered': False})
    registered = Registration.objects.filter(
        event_id=event_id, user=request.user
    ).exists()
    return JsonResponse({'registered': registered})


@login_required(login_url='/accounts/login/')
@require_http_methods(["POST"])
def update_registration(request, reg_id):
    """Update registration details for a specific upcoming event."""
    reg = get_object_or_404(Registration, id=reg_id, user=request.user)
    
    # Check if the event is already past
    if reg.event.date < datetime.date.today():
        messages.error(request, 'Cannot update registration for a completed event.')
        return redirect('student_dashboard')

    reg.name = request.POST.get('name', reg.name).strip()
    
    new_email = request.POST.get('email', reg.email).strip()
    if new_email and new_email != reg.email:
        if Registration.objects.filter(event=reg.event, email=new_email).exclude(id=reg.id).exists():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                from django.http import HttpResponse
                return HttpResponse('This email is already registered for this event.', status=400)
            messages.error(request, 'This email is already registered for this event.')
            return redirect('student_dashboard')
        reg.email = new_email

    reg.mobile = request.POST.get('mobile', reg.mobile).strip()
    reg.course = request.POST.get('course', reg.course).strip()
    reg.branch = request.POST.get('branch', reg.branch).strip()
    
    if reg.mobile and (not reg.mobile.isdigit() or len(reg.mobile) != 10):
        messages.error(request, 'Please enter a valid 10-digit mobile number.')
    else:
        reg.save()
        messages.success(request, f'Registration for {reg.event.name} updated successfully! ✅')
    
    return redirect('student_dashboard')


@login_required(login_url='/accounts/login/')
@require_http_methods(["POST"])
def cancel_registration(request, reg_id):
    """Cancel registration for an upcoming event."""
    reg = get_object_or_404(Registration, id=reg_id, user=request.user)
    
    if reg.event.date < datetime.date.today():
        messages.error(request, 'Cannot cancel registration for a completed event.')
    else:
        event_name = reg.event.name
        reg.delete()
        messages.success(request, f'Registration for {event_name} has been cancelled. ❌')
        
    return redirect('student_dashboard')


@login_required(login_url='/accounts/login/')
def api_my_registrations(request):
    """Return a detailed list of registrations for the current user."""
    registrations = Registration.objects.filter(user=request.user)
    return JsonResponse({
        'registered_event_ids': list(registrations.values_list('event_id', flat=True)),
        'registrations': [
            {
                'id': reg.id,
                'event_id': reg.event_id,
                'name': reg.name,
                'email': reg.email,
                'mobile': reg.mobile,
                'course': reg.course,
                'branch': reg.branch
            } for reg in registrations
        ]
    })
