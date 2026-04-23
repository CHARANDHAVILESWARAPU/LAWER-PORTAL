from django.db import models
from accounts.models import User
from cases.models import Case


class Message(models.Model):
    """
    Encrypted message model for client-lawyer communication.
    Messages are encrypted at rest using AES-256-GCM.
    """
    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_messages'
    )
    encrypted_content = models.TextField()  # Stores encrypted message
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.full_name} to {self.receiver.full_name}"

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']


class MessageAttachment(models.Model):
    """
    Attachment for messages (optional file attachments).
    """
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to='message_attachments/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_attachments'
