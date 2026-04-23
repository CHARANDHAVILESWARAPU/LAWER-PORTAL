from rest_framework import serializers
from .models import Message, MessageAttachment
from .encryption import decrypt_message
from accounts.serializers import UserSerializer


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ['id', 'filename', 'file_size', 'uploaded_at']


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer that automatically decrypts message content on read.
    """
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    content = serializers.SerializerMethodField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'case', 'sender', 'receiver', 'content',
            'is_read', 'attachments', 'created_at'
        ]

    def get_content(self, obj):
        """Decrypt content when serializing."""
        try:
            return decrypt_message(obj.encrypted_content)
        except ValueError:
            return "[Error: Could not decrypt message]"


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending new messages."""
    case_id = serializers.IntegerField()
    receiver_id = serializers.IntegerField()
    content = serializers.CharField(max_length=10000)


class MessageListSerializer(serializers.ModelSerializer):
    """Lighter serializer for message lists."""
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    preview = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'case', 'sender_name', 'preview', 'is_read', 'created_at']

    def get_preview(self, obj):
        """Show first 50 chars of decrypted message."""
        try:
            content = decrypt_message(obj.encrypted_content)
            return content[:50] + '...' if len(content) > 50 else content
        except ValueError:
            return "[Encrypted]"
