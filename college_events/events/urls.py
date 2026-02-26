from django.urls import path
from . import views

urlpatterns = [
    # ── Main Pages ──────────────────────────────────────────────
    path('', views.homepage, name='homepage'),
    path('events/', views.event_list, name='event_list'),
    path('events/completed/', views.completed_events, name='completed_events'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),

    # ── Registration ─────────────────────────────────────────────
    path('register/<int:event_id>/', views.register, name='register'),

    # ── Admin ────────────────────────────────────────────────────
    path('admin-login/', views.admin_login_view, name='admin_login'),
    path('admin-panel/', views.admin_panel, name='admin_panel'),
    path('admin-logout/', views.admin_logout_view, name='admin_logout'),

    # ── Student Accounts ─────────────────────────────────────────
    path('accounts/signup/', views.student_signup, name='student_signup'),
    path('accounts/login/', views.student_login_view, name='student_login'),
    path('accounts/logout/', views.student_logout_view, name='student_logout'),
    path('accounts/dashboard/', views.student_dashboard, name='student_dashboard'),
    path('accounts/profile/update/', views.student_update_profile, name='student_update_profile'),
    path('accounts/registration/<int:reg_id>/update/', views.update_registration, name='update_registration'),
    path('accounts/registration/<int:reg_id>/cancel/', views.cancel_registration, name='cancel_registration'),

    # ── JSON API Endpoints ───────────────────────────────────────
    path('api/events/', views.get_events_api, name='get_events_api'),
    path('api/registrations/', views.get_registrations_api, name='get_registrations_api'),
    path('api/events/create/', views.create_event_api, name='create_event_api'),
    path('api/events/<int:event_id>/update/', views.update_event_api, name='update_event_api'),
    path('api/events/<int:event_id>/delete/', views.delete_event_api, name='delete_event_api'),
    path('api/user/profile/', views.student_profile_api, name='student_profile_api'),
    path('api/user/registrations/', views.api_my_registrations, name='api_my_registrations'),
    path('api/check-registration/', views.api_check_registration, name='api_check_registration'),
]
