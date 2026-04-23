from rest_framework import serializers
from .models import Appointment
from accounts.serializers import UserSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    """Full appointment serializer."""
    scheduled_by = UserSerializer(read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    client_name = serializers.CharField(source='case.client.full_name', read_only=True)
    lawyer_name = serializers.CharField(source='case.lawyer.full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'case', 'case_number', 'case_title', 'client_name', 'lawyer_name',
            'scheduled_by', 'datetime', 'duration', 'appointment_type',
            'location', 'notes', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'scheduled_by', 'created_at', 'updated_at']


class AppointmentListSerializer(serializers.ModelSerializer):
    """Lighter serializer for appointment lists."""
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    client_name = serializers.CharField(source='case.client.full_name', read_only=True)
    lawyer_name = serializers.CharField(source='case.lawyer.full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'case_number', 'client_name', 'lawyer_name',
            'datetime', 'duration', 'appointment_type', 'status'
        ]


class CreateAppointmentSerializer(serializers.Serializer):
    """Serializer for creating appointments."""
    case_id = serializers.IntegerField()
    datetime = serializers.DateTimeField()
    duration = serializers.IntegerField(default=60, min_value=15, max_value=480)
    appointment_type = serializers.ChoiceField(
        choices=Appointment.TYPE_CHOICES, default='consultation'
    )
    location = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
