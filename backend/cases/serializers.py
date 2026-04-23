from rest_framework import serializers
from .models import Case, CaseNote
from accounts.serializers import UserSerializer


class CaseNoteSerializer(serializers.ModelSerializer):
    """Serializer for case notes."""
    author = UserSerializer(read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = CaseNote
        fields = ['id', 'case', 'author', 'author_name', 'content', 'is_internal', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class CaseSerializer(serializers.ModelSerializer):
    """Serializer for case details."""
    client = UserSerializer(read_only=True)
    lawyer = UserSerializer(read_only=True)
    client_id = serializers.IntegerField(write_only=True)
    lawyer_id = serializers.IntegerField(write_only=True)
    notes = CaseNoteSerializer(many=True, read_only=True)
    notes_count = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id', 'title', 'description', 'case_number', 'client', 'lawyer',
            'client_id', 'lawyer_id', 'status', 'priority', 'category',
            'notes', 'notes_count', 'created_at', 'updated_at', 'closed_at'
        ]
        read_only_fields = ['id', 'case_number', 'created_at', 'updated_at']

    def get_notes_count(self, obj):
        return obj.notes.count()


class CaseListSerializer(serializers.ModelSerializer):
    """Lighter serializer for case lists."""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    lawyer_name = serializers.CharField(source='lawyer.full_name', read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'title', 'case_number', 'client_name', 'lawyer_name',
            'status', 'priority', 'category', 'created_at', 'updated_at'
        ]
