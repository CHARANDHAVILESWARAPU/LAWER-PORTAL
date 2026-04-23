from rest_framework import serializers
from .models import TimeEntry, Invoice
from accounts.serializers import UserSerializer


class TimeEntrySerializer(serializers.ModelSerializer):
    """Serializer for time entries."""
    lawyer = UserSerializer(read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'case', 'case_number', 'lawyer', 'date', 'hours',
            'description', 'hourly_rate', 'amount', 'is_billable',
            'invoiced', 'created_at'
        ]
        read_only_fields = ['id', 'lawyer', 'invoiced', 'created_at']


class TimeEntryListSerializer(serializers.ModelSerializer):
    """Lighter serializer for time entry lists."""
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'case_number', 'date', 'hours', 'description',
            'amount', 'is_billable', 'invoiced'
        ]


class CreateTimeEntrySerializer(serializers.Serializer):
    """Serializer for creating time entries."""
    case_id = serializers.IntegerField()
    date = serializers.DateField()
    hours = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0.25)
    description = serializers.CharField()
    hourly_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    is_billable = serializers.BooleanField(default=True)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices."""
    entries = TimeEntrySerializer(many=True, read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    client_name = serializers.CharField(source='case.client.full_name', read_only=True)
    client_email = serializers.CharField(source='case.client.email', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'case', 'case_number', 'client_name',
            'client_email', 'entries', 'subtotal', 'tax_rate', 'tax_amount',
            'total_amount', 'admin_share', 'lawyer_share',
            'status', 'notes', 'due_date', 'paid_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount',
            'total_amount', 'admin_share', 'lawyer_share',
            'created_at', 'updated_at'
        ]


class InvoiceListSerializer(serializers.ModelSerializer):
    """Lighter serializer for invoice lists."""
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    client_name = serializers.CharField(source='case.client.full_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'case_number', 'client_name',
            'total_amount', 'status', 'due_date', 'created_at'
        ]


class GenerateInvoiceSerializer(serializers.Serializer):
    """Serializer for generating invoices."""
    case_id = serializers.IntegerField()
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0, min_value=0
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    due_days = serializers.IntegerField(default=30, min_value=1)
