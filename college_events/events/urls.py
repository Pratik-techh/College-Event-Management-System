from django.urls import path
from . import views

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('register/<int:event_id>/', views.register, name='register'),
    path('admin-login/', views.admin_login_view, name='admin_login'),
    path('admin-panel/', views.admin_panel, name='admin_panel'),
    path('admin-logout/', views.admin_logout_view, name='admin_logout'),
    path('api/events/', views.get_events_api, name='get_events_api'),
    path('api/registrations/', views.get_registrations_api, name='get_registrations_api'),
    path('api/events/create/', views.create_event_api, name='create_event_api'),
    path('api/events/<int:event_id>/update/', views.update_event_api, name='update_event_api'),
    path('api/events/<int:event_id>/delete/', views.delete_event_api, name='delete_event_api'),
]