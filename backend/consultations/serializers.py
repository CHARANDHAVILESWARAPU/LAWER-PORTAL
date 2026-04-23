from rest_framework import serializers
from .models import ConsultationSlot, Consultation, CallLog


class ConsultationSlotSerializer(serializers.ModelSerializer):
    lawyer_name = serializers.CharField(source='lawyer.full_name', read_only=True)
    lawyer_specialization = serializers.CharField(source='lawyer.specialization', read_only=True)

    class Meta:
        model = ConsultationSlot
        fields = [
            'id', 'lawyer', 'lawyer_name', 'lawyer_specialization',
            'date', 'start_time', 'end_time', 'is_booked', 'created_at'
        ]
        read_only_fields = ['id', 'is_booked', 'created_at']


class CallLogSerializer(serializers.ModelSerializer):
    participant_name = serializers.CharField(source='participant.full_name', read_only=True)

    class Meta:
        model = CallLog
        fields = [
            'id', 'participant', 'participant_name',
            'joined_at', 'left_at', 'duration_seconds'
        ]


class ConsultationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing consultations."""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    lawyer_name = serializers.CharField(source='lawyer.full_name', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True, default=None)
    slot_date = serializers.DateField(source='slot.date', read_only=True, default=None)
    slot_start = serializers.TimeField(source='slot.start_time', read_only=True, default=None)
    slot_end = serializers.TimeField(source='slot.end_time', read_only=True, default=None)

    class Meta:
        model = Consultation
        fields = [
            'id', 'consultation_number', 'client_name', 'lawyer_name',
            'case_number', 'slot_date', 'slot_start', 'slot_end',
            'meeting_id', 'meeting_token',
            'status', 'subject', 'created_at'
        ]


class ConsultationDetailSerializer(serializers.ModelSerializer):
    """Full serializer with meeting info and call logs."""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    lawyer_name = serializers.CharField(source='lawyer.full_name', read_only=True)
    lawyer_specialization = serializers.CharField(source='lawyer.specialization', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True, default=None)
    case_title = serializers.CharField(source='case.title', read_only=True, default=None)
    slot_detail = ConsultationSlotSerializer(source='slot', read_only=True)
    call_logs = CallLogSerializer(many=True, read_only=True)
    meeting_url = serializers.ReadOnlyField()

    class Meta:
        model = Consultation
        fields = [
            'id', 'consultation_number', 'client', 'client_name', 'client_email',
            'lawyer', 'lawyer_name', 'lawyer_specialization',
            'case', 'case_number', 'case_title',
            'slot', 'slot_detail', 'meeting_id', 'meeting_url',
            'status', 'subject', 'notes', 'call_logs',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consultation_number', 'meeting_id', 'meeting_url']
