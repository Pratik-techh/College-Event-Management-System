# How to Run the Server Properly

## The Issue You Experienced

When you ran `python manage.py runserver` without setting environment variables, Django defaulted to `DEBUG=False` (for security). This prevented static files (CSS/JavaScript) from being served, causing:

1. ❌ No styling on the page (broken frontend)
2. ❌ JavaScript not loading (events couldn't display)
3. ❌ 404 errors for all static files

## ✅ Correct Way to Run the Server

### Option 1: Set Environment Variables Each Time

```powershell
$env:DEBUG="True"
$env:SECRET_KEY="django-insecure-87rc!&=zj$()tx1mw%m^7%_82$=2^k(7=jeft2_d6jqx8nacrm"
python manage.py runserver
```

### Option 2: Create a Run Script (Recommended)

Create a file called `run.ps1` in the `college_events` folder:

```powershell
# Set environment variables
$env:DEBUG="True"
$env:SECRET_KEY="django-insecure-87rc!&=zj$()tx1mw%m^7%_82$=2^k(7=jeft2_d6jqx8nacrm"
$env:ALLOWED_HOSTS="localhost,127.0.0.1"

# Run the server
python manage.py runserver
```

Then just run:
```powershell
.\run.ps1
```

### Option 3: Use python-decouple (Best for Teams)

Install the package:
```powershell
pip install python-decouple
```

Update `settings.py` line 7:
```python
from decouple import config

SECRET_KEY = config('SECRET_KEY', default='django-insecure-87rc!&=zj$()tx1mw%m^7%_82$=2^k(7=jeft2_d6jqx8nacrm')
DEBUG = config('DEBUG', default=False, cast=bool)
```

Create a `.env` file (already provided):
```
DEBUG=True
SECRET_KEY=your-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
```

## About Previous Registrations

> **Why aren't my previous registrations showing?**

The old system stored registrations in **localStorage** (your browser's local storage). The new system uses the **Django database** (SQLite).

**What this means**:
- ✅ Old localStorage registrations are still in your browser
- ❌ They are NOT in the database
- ❌ The new system reads from the database, not localStorage

**To see registrations**:
1. Register for an event through the new system
2. Login to admin panel (http://localhost:8000/admin-panel/)
3. You'll see database registrations there

## Quick Reference

**Start server correctly**:
```powershell
$env:DEBUG="True"; python manage.py runserver
```

**Create superuser** (if not done):
```powershell
python manage.py createsuperuser
```

**Access admin panel**:
- URL: http://localhost:8000/admin-panel/
- Login with your superuser credentials

**Check database events**:
```powershell
python manage.py shell
>>> from events.models import Event
>>> Event.objects.all()
```
