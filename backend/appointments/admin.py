from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'case', 'datetime', 'duration', 'appointment_type', 'status', 'scheduled_by'
    ]
    list_filter = ['status', 'appointment_type', 'datetime']
    search_fields = ['case__case_number', 'case__client__full_name', 'case__lawyer__full_name']
