from django.db import models
from accounts.models import User


class Case(models.Model):
    """
    Legal case model linking a client to a lawyer.
    Tracks case status and progress.
    """
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('pending', 'Pending Review'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    case_number = models.CharField(max_length=50, unique=True, blank=True)
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='client_cases'
    )
    lawyer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='lawyer_cases'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    category = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.case_number:
            # Auto-generate case number: CASE-YYYY-XXXX
            from datetime import datetime
            year = datetime.now().year
            last_case = Case.objects.filter(
                case_number__startswith=f'CASE-{year}'
            ).order_by('-id').first()
            if last_case:
                last_num = int(last_case.case_number.split('-')[-1])
                self.case_number = f'CASE-{year}-{last_num + 1:04d}'
            else:
                self.case_number = f'CASE-{year}-0001'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.case_number}: {self.title}"

    class Meta:
        db_table = 'cases'
        ordering = ['-created_at']


class CaseNote(models.Model):
    """
    Notes and updates for a case.
    Used for tracking progress and communication history.
    """
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal notes visible only to lawyer
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note on {self.case.case_number} by {self.author.full_name}"

    class Meta:
        db_table = 'case_notes'
        ordering = ['-created_at']
