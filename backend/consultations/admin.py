from django.contrib import admin
from .models import ConsultationSlot, Consultation, CallLog


class CallLogInline(admin.TabularInline):
    model = CallLog
    extra = 0
    readonly_fields = ('participant', 'joined_at', 'left_at', 'duration_seconds')


@admin.register(ConsultationSlot)
class ConsultationSlotAdmin(admin.ModelAdmin):
    list_display = ('lawyer', 'date', 'start_time', 'end_time', 'is_booked')
    list_filter = ('is_booked', 'date', 'lawyer')


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = (
        'consultation_number', 'client', 'lawyer',
        'status', 'slot', 'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = ('consultation_number', 'client__full_name', 'lawyer__full_name')
    inlines = [CallLogInline]
    readonly_fields = ('meeting_id', 'meeting_token', 'consultation_number')


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = ('consultation', 'participant', 'joined_at', 'left_at', 'duration_seconds')
    list_filter = ('joined_at',)
