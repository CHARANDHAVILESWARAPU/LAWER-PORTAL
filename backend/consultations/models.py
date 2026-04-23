import uuid
import hashlib
import hmac
from django.db import models
from django.conf import settings
from django.utils import timezone


class ConsultationSlot(models.Model):
    """
    Time slots a lawyer makes available for video consultations.
    Clients browse open slots and book one.
    """
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultation_slots'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultation_slots'
        ordering = ['date', 'start_time']
        unique_together = ['lawyer', 'date', 'start_time']

    def __str__(self):
        return f"{self.lawyer.full_name} | {self.date} {self.start_time}-{self.end_time}"


class Consultation(models.Model):
    """
    A booked video consultation between client and lawyer.
    Tracks the full lifecycle: booked -> approved -> in_progress -> completed.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    consultation_number = models.CharField(max_length=30, unique=True, blank=True)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_consultations'
    )
    lawyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lawyer_consultations'
    )
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations'
    )
    slot = models.OneToOneField(
        ConsultationSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    meeting_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    meeting_token = models.CharField(max_length=64, blank=True, editable=False)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    subject = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consultations'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.consultation_number:
            year = timezone.now().year
            count = Consultation.objects.filter(
                created_at__year=year
            ).count() + 1
            self.consultation_number = f"VC-{year}-{count:04d}"
        if not self.meeting_token:
            self.meeting_token = self._generate_token()
        super().save(*args, **kwargs)

    def _generate_token(self):
        """HMAC-SHA256 token derived from meeting_id + secret key."""
        key = settings.SECRET_KEY.encode()
        msg = str(self.meeting_id).encode()
        return hmac.new(key, msg, hashlib.sha256).hexdigest()[:48]

    @property
    def meeting_url(self):
        """Jitsi room name derived from meeting_id for uniqueness."""
        return f"LegalPortal_{self.meeting_id.hex[:16]}"

    def __str__(self):
        return f"{self.consultation_number} | {self.client.full_name} <-> {self.lawyer.full_name}"


class CallLog(models.Model):
    """
    Tracks when each participant joins/leaves and the total call duration.
    One row per participant per session.
    """
    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='call_logs'
    )
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='call_logs'
    )
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'call_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.participant.full_name} in {self.consultation.consultation_number}"
