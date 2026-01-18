import os
from django.http import HttpResponse

class DisableCacheMiddleware:
    """Middleware to disable caching for development."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only apply in development (DEBUG=True)
        if os.environ.get('DEBUG', 'False') == 'True':
            if request.path.startswith('/static/'):
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
        
        return response
