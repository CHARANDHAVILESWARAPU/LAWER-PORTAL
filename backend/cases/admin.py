from django.contrib import admin
from .models import Case, CaseNote


class CaseNoteInline(admin.TabularInline):
    model = CaseNote
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['case_number', 'title', 'client', 'lawyer', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['case_number', 'title', 'client__full_name', 'lawyer__full_name']
    inlines = [CaseNoteInline]


@admin.register(CaseNote)
class CaseNoteAdmin(admin.ModelAdmin):
    list_display = ['case', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
