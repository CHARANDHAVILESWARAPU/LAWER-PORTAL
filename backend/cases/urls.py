from django.urls import path
from .views import (
    CaseListCreateView, CaseDetailView, CaseNoteView,
    CaseStatusUpdateView, CaseStatsView
)

urlpatterns = [
    path('', CaseListCreateView.as_view(), name='case_list_create'),
    path('stats/', CaseStatsView.as_view(), name='case_stats'),
    path('<int:case_id>/', CaseDetailView.as_view(), name='case_detail'),
    path('<int:case_id>/notes/', CaseNoteView.as_view(), name='case_notes'),
    path('<int:case_id>/status/', CaseStatusUpdateView.as_view(), name='case_status'),
]
