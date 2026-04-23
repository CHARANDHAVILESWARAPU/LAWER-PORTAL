from django.db import models
from django.conf import settings


class ChatSession(models.Model):
    """
    Conversation session per user.
    Each session stores a thread of messages to maintain memory.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    title = models.CharField(max_length=255, default='New Chat')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat #{self.id} - {self.user.full_name}"


class ChatMessage(models.Model):
    """
    Individual message within a chat session.
    Stores both user messages and AI responses to maintain conversation memory.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    INPUT_TYPE_CHOICES = [
        ('text', 'Text'),
        ('voice', 'Voice'),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    input_type = models.CharField(
        max_length=5,
        choices=INPUT_TYPE_CHOICES,
        default='text'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
