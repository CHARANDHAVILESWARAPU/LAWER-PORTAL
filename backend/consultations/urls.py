from django.urls import path
from . import views

urlpatterns = [
    # Slots
    path('slots/', views.SlotListCreateView.as_view(), name='consultation-slots'),
    path('slots/<int:slot_id>/', views.SlotDeleteView.as_view(), name='consultation-slot-delete'),
    # Consultations
    path('', views.ConsultationListView.as_view(), name='consultation-list'),
    path('book/', views.BookConsultationView.as_view(), name='consultation-book'),
    path('history/', views.ConsultationHistoryView.as_view(), name='consultation-history'),
    path('<int:pk>/', views.ConsultationDetailView.as_view(), name='consultation-detail'),
    path('<int:pk>/status/', views.ConsultationStatusView.as_view(), name='consultation-status'),
    # Meeting
    path('join/<uuid:meeting_id>/', views.JoinMeetingView.as_view(), name='consultation-join'),
    path('leave/<uuid:meeting_id>/', views.LeaveMeetingView.as_view(), name='consultation-leave'),
]
