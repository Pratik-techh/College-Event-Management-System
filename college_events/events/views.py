from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from .models import Event, Registration
import json

def event_list(request):
    """Display a list of all events."""
    events = Event.objects.all()
    return render(request, 'events/event_list.html', {'events': events})

@require_http_methods(["GET", "POST"])
def register(request, event_id):
    """Register a user for a specific event."""
    event = get_object_or_404(Event, id=event_id)
    
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        mobile = request.POST.get('mobile', '').strip()
        course = request.POST.get('course', '').strip()
        branch = request.POST.get('branch', '').strip()

        if name and email and mobile and course and branch:
            # Check for duplicate registration (same email for same event)
            existing = Registration.objects.filter(event=event, email=email).exists()
            if existing:
                messages.error(request, 'You have already registered for this event.')
                return render(request, 'events/register.html', {'event': event})
            
            # Validate mobile number
            if not mobile.isdigit() or len(mobile) != 10:
                messages.error(request, 'Please enter a valid 10-digit mobile number.')
                return render(request, 'events/register.html', {'event': event})
            
            Registration.objects.create(
                event=event,
                name=name,
                email=email,
                mobile=mobile,
                course=course,
                branch=branch
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
        if user is not None:
            login(request, user)
            return redirect('admin_panel')
        else:
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'events/admin-login.html')

@login_required
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

@login_required
def admin_logout_view(request):
    """Handle admin logout."""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('event_list')

@require_http_methods(["GET"])
def get_events_api(request):
    """JSON API endpoint to fetch events for frontend."""
    events = Event.objects.all().values('id', 'name', 'description', 'date', 'time', 'venue', 'image')
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
                'date': event.date.strftime('%Y-%m-%d'),
                'time': event.time.strftime('%H:%M') if event.time else None,
                'venue': event.venue,
                'image': event.image
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@csrf_exempt
@require_http_methods(["PUT", "POST"])  # Allow POST for compatibility
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
                'date': event.date.strftime('%Y-%m-%d'),
                'time': event.time.strftime('%H:%M') if event.time else None,
                'venue': event.venue,
                'image': event.image
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@csrf_exempt
@require_http_methods(["DELETE", "POST"])  # Allow POST for compatibility  
def delete_event_api(request, event_id):
    """API endpoint to delete an event."""
    try:
        event = get_object_or_404(Event, id=event_id)
        event.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@require_http_methods(["GET"])
def get_registrations_api(request):
    """JSON API endpoint to fetch all registrations for admin panel."""
    registrations = Registration.objects.all().select_related('event').values(
        'id', 'name', 'email', 'mobile', 'course', 'branch', 'timestamp',
        'event__id', 'event__name', 'event__date', 'event__venue'
    )
    registrations_list = list(registrations)
    
    # Convert timestamp to string for JSON serialization
    for reg in registrations_list:
        reg['timestamp'] = reg['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        reg['event__date'] = reg['event__date'].strftime('%Y-%m-%d')
    
    response = JsonResponse(registrations_list, safe=False)
    # Prevent caching so admin panel always shows latest data
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response