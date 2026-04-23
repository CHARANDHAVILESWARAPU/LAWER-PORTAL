from django.contrib import admin
from .models import Message, MessageAttachment


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'sender', 'receiver', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__full_name', 'receiver__full_name', 'case__case_number']
