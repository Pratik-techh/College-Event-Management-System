from django.contrib import admin
from .models import Event, Registration

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'time', 'venue']
    list_filter = ['date']
    search_fields = ['name', 'venue', 'description']
    date_hierarchy = 'date'
    ordering = ['-date']

@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'mobile', 'event', 'course', 'branch', 'timestamp']
    list_filter = ['event', 'course', 'timestamp']
    search_fields = ['name', 'email', 'mobile', 'event__name']
    date_hierarchy = 'timestamp'
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']