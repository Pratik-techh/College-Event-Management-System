# Set environment variables for development
$env:DEBUG="True"
$env:SECRET_KEY="django-insecure-87rc!&=zj$()tx1mw%m^7%_82$=2^k(7=jeft2_d6jqx8nacrm"
$env:ALLOWED_HOSTS="localhost,127.0.0.1"

Write-Host "Starting Django development server..." -ForegroundColor Green
Write-Host "Environment: DEBUG=True" -ForegroundColor Yellow
Write-Host ""

# Run the Django development server
python manage.py runserver
