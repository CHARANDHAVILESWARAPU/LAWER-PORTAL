from django.db import models
from accounts.models import User
from cases.models import Case


class Appointment(models.Model):
    """
    Appointment model for scheduling consultations.
    Links to a case for context.
    """
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    TYPE_CHOICES = [
        ('consultation', 'Initial Consultation'),
        ('follow_up', 'Follow Up'),
        ('court_prep', 'Court Preparation'),
        ('document_review', 'Document Review'),
        ('other', 'Other'),
    ]

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='appointments'
    )
    scheduled_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='created_appointments'
    )
    datetime = models.DateTimeField()
    duration = models.IntegerField(default=60)  # minutes
    appointment_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default='consultation'
    )
    location = models.CharField(max_length=255, blank=True)  # or "Virtual"
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='scheduled'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment for {self.case.case_number} on {self.datetime}"

    class Meta:
        db_table = 'appointments'
        ordering = ['datetime']
