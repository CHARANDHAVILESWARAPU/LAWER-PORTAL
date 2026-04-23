from django.urls import path
from .views import (
    AppointmentListCreateView, AppointmentDetailView, AppointmentStatusView,
    UpcomingAppointmentsView, CaseAppointmentsView
)

urlpatterns = [
    path('', AppointmentListCreateView.as_view(), name='appointment_list_create'),
    path('upcoming/', UpcomingAppointmentsView.as_view(), name='upcoming_appointments'),
    path('case/<int:case_id>/', CaseAppointmentsView.as_view(), name='case_appointments'),
    path('<int:appointment_id>/', AppointmentDetailView.as_view(), name='appointment_detail'),
    path('<int:appointment_id>/status/', AppointmentStatusView.as_view(), name='appointment_status'),
]
