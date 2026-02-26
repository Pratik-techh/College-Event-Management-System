from django.db import models
from django.contrib.auth.models import User


COURSE_CHOICES = [
    ('B.Tech', 'B.Tech'), ('M.Tech', 'M.Tech'), ('BCA', 'BCA'),
    ('MCA', 'MCA'), ('BSc', 'BSc'), ('MBA', 'MBA'), ('Other', 'Other'),
]

BRANCH_CHOICES = [
    ('Computer Science', 'Computer Science'),
    ('Information Technology', 'Information Technology'),
    ('Electronics', 'Electronics'),
    ('Mechanical', 'Mechanical'),
    ('Civil', 'Civil'),
    ('Other', 'Other'),
]

YEAR_CHOICES = [
    ('1st Year', '1st Year'), ('2nd Year', '2nd Year'),
    ('3rd Year', '3rd Year'), ('4th Year', '4th Year'),
    ('Alumni', 'Alumni'),
]


class StudentProfile(models.Model):
    """Extended profile for student accounts."""
    user   = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    mobile = models.CharField(max_length=10, blank=True)
    course = models.CharField(max_length=50, blank=True, choices=COURSE_CHOICES)
    branch = models.CharField(max_length=100, blank=True, choices=BRANCH_CHOICES)
    year   = models.CharField(max_length=20, blank=True, choices=YEAR_CHOICES)
    bio    = models.TextField(blank=True, max_length=300)
    # Random accent colour for the avatar initials circle
    avatar_color = models.CharField(max_length=7, default='#6366f1')
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.course})"

    def get_initials(self):
        name = self.user.get_full_name() or self.user.username
        parts = name.split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return name[:2].upper()


class Event(models.Model):
    name        = models.CharField(max_length=100)
    description = models.TextField()
    date        = models.DateField()
    time        = models.TimeField(null=True, blank=True)
    venue       = models.CharField(max_length=100)
    image       = models.URLField(
        max_length=500, blank=True,
        default='https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800'
    )

    @property
    def get_image_url(self):
        if not self.image:
            return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800'
        
        url = self.image
        if 'images.unsplash.com' in url:
            return url
            
        if 'unsplash.com/photos/' in url:
            # Extract ID from slug like 'name-of-photo-ID'
            parts = url.strip('/').split('/')
            last_part = parts[-1]
            photo_id = last_part.split('-')[-1]
            # Use the download redirect which works well as an img src
            return f'https://unsplash.com/photos/{photo_id}/download?force=true&w=800'
            
        return url

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-date']


class Registration(models.Model):
    event     = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    # Optional link to a student account (null = guest registration)
    user      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='registrations')
    name      = models.CharField(max_length=100)
    email     = models.EmailField()
    mobile    = models.CharField(max_length=10)
    course    = models.CharField(max_length=100)
    branch    = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.event.name}"

    class Meta:
        ordering = ['-timestamp']
        unique_together = ['event', 'email']
