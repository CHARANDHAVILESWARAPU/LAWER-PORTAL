from django.db import models
from accounts.models import User
from cases.models import Case
import uuid
import os


def document_upload_path(instance, filename):
    """
    Generate unique file path for documents.
    Format: documents/case_<id>/<uuid>_<filename>
    """
    ext = filename.split('.')[-1] if '.' in filename else ''
    unique_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    return f"documents/case_{instance.case.id}/{unique_name}"


class Document(models.Model):
    """
    Document model for case-related files.
    Stores files securely with metadata.
    """
    CATEGORY_CHOICES = [
        ('contract', 'Contract'),
        ('evidence', 'Evidence'),
        ('correspondence', 'Correspondence'),
        ('court_filing', 'Court Filing'),
        ('identification', 'Identification'),
        ('financial', 'Financial'),
        ('other', 'Other'),
    ]

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='uploaded_documents'
    )
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    file_type = models.CharField(max_length=100)  # MIME type
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='other'
    )
    description = models.TextField(blank=True)
    is_confidential = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_filename} ({self.case.case_number})"

    def delete(self, *args, **kwargs):
        # Delete file from storage when document is deleted
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
