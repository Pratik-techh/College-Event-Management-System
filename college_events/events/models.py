from django.db import models

class Event(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)  # Added time field
    venue = models.CharField(max_length=100)
    image = models.URLField(max_length=500, blank=True, default='https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800')
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-date']

class Registration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    name = models.CharField(max_length=100)
    email = models.EmailField()
    mobile = models.CharField(max_length=10)  # Changed from college
    course = models.CharField(max_length=100)  # Added course field
    branch = models.CharField(max_length=100)  # Added branch field
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.event.name}"
    
    class Meta:
        ordering = ['-timestamp']
        unique_together = ['event', 'email']  # Prevent duplicate registrations