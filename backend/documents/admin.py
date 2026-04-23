from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        'original_filename', 'case', 'uploaded_by', 'category',
        'is_confidential', 'created_at'
    ]
    list_filter = ['category', 'is_confidential', 'created_at']
    search_fields = ['original_filename', 'case__case_number', 'uploaded_by__full_name']
