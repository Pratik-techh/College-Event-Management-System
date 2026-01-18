# Phase 1 Implementation - Setup Instructions

## Prerequisites
Before running the application, you need to set up a few things:

### 1. Install Required Python Package (if not already installed)
```powershell
# No additional packages needed for Phase 1
```

### 2. Set Environment Variables
Copy the `.env.example` file and update it with your settings:

```powershell
# For development, you can use these defaults
$env:SECRET_KEY="django-insecure-87rc!&=zj$()tx1mw%m^7%_82$=2^k(7=jeft2_d6jqx8nacrm"
$env:DEBUG="True"
$env:ALLOWED_HOSTS="localhost,127.0.0.1"
```

Or create a `.env` file manually (note: it will be git ignored)

### 3. Django Setup Commands
Run these commands in order:

```powershell
cd college_events

# Run database migrations
python manage.py migrate

# Create a superuser for admin access
python manage.py createsuperuser
# When prompted, enter:
# - Username: (choose your username, e.g., "admin")
# - Email: (your email)
# - Password: (choose a secure password)

# Start the development server
python manage.py runserver
```

### 4. Access the Application
- **Homepage**: http://localhost:8000/
- **Admin Login**: http://localhost:8000/admin-login/
- **Django Admin**: http://localhost:8000/admin/

## What Changed in Phase 1

✅ **Security**:
- SECRET_KEY moved to environment variables
- DEBUG mode controlled by environment variable
- ALLOWED_HOSTS properly configured
- .gitignore created to prevent sensitive data commits

✅ **Authentication**:
- Django's built-in authentication system implemented
- Hardcoded login (pratik/1234) replaced with database users
- @login_required decorator protecting admin views
- Proper logout functionality added

✅ **Frontend-Backend Integration**:
- Events now loaded from Django database via API
- Registration form connects to Django backend
- CSRF protection on all forms
- Duplicate registration prevention

✅ **Database**:
- Sample events added via migration
- Registration records properly stored in SQLite

## Testing

1. **View Events**: Navigate to homepage - should load events from database
2. **Register**: Click "Register Now" on an event and fill the form
3. **Admin Login**: Go to /admin-login/ and use your superuser credentials
4. **Admin Panel**: View registrations and events after logging in
5. **Logout**: Click logout button in admin panel

## Known Changes
- You must create a superuser; the old hardcoded login (pratik/1234) no longer works
- Events are now in the database, not localStorage
- For DEBUG mode, set environment variable DEBUG=True
