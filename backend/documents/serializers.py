from rest_framework import serializers
from .models import Document
from accounts.serializers import UserSerializer


class DocumentSerializer(serializers.ModelSerializer):
    """Full document serializer with uploader details."""
    uploaded_by = UserSerializer(read_only=True)
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'case', 'uploaded_by', 'file', 'original_filename',
            'file_size', 'file_size_display', 'file_type', 'category',
            'description', 'is_confidential', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_file_size_display(self, obj):
        """Convert bytes to human-readable format."""
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


class DocumentListSerializer(serializers.ModelSerializer):
    """Lighter serializer for document lists."""
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'original_filename', 'uploaded_by_name', 'file_type',
            'file_size', 'category', 'description', 'is_confidential', 'created_at'
        ]


class UploadDocumentSerializer(serializers.Serializer):
    """Serializer for document upload."""
    case_id = serializers.IntegerField()
    file = serializers.FileField()
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES, default='other')
    description = serializers.CharField(required=False, allow_blank=True)
    is_confidential = serializers.BooleanField(default=False)
