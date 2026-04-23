from django.contrib import admin
from .models import TimeEntry, Invoice


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['case', 'lawyer', 'date', 'hours', 'hourly_rate', 'is_billable', 'invoiced']
    list_filter = ['is_billable', 'invoiced', 'date']
    search_fields = ['case__case_number', 'lawyer__full_name', 'description']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'case', 'total_amount', 'status', 'due_date', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['invoice_number', 'case__case_number', 'case__client__full_name']
