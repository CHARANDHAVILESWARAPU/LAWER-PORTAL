from django.urls import path
from .views import (
    TimeEntryListCreateView, TimeEntryDetailView,
    InvoiceListView, GenerateInvoiceView, InvoiceDetailView,
    BillingSummaryView
)

urlpatterns = [
    # Time entries
    path('time-entries/', TimeEntryListCreateView.as_view(), name='time_entry_list_create'),
    path('time-entries/<int:entry_id>/', TimeEntryDetailView.as_view(), name='time_entry_detail'),

    # Invoices
    path('invoices/', InvoiceListView.as_view(), name='invoice_list'),
    path('invoices/generate/', GenerateInvoiceView.as_view(), name='generate_invoice'),
    path('invoices/<int:invoice_id>/', InvoiceDetailView.as_view(), name='invoice_detail'),

    # Summary
    path('summary/', BillingSummaryView.as_view(), name='billing_summary'),
]
