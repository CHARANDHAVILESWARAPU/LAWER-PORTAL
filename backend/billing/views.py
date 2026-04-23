from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import TimeEntry, Invoice
from .serializers import (
    TimeEntrySerializer, TimeEntryListSerializer, CreateTimeEntrySerializer,
    InvoiceSerializer, InvoiceListSerializer, GenerateInvoiceSerializer
)
from cases.models import Case
from accounts.permissions import IsLawyer, IsLawyerOrAdmin


class TimeEntryListCreateView(APIView):
    """
    GET /api/billing/time-entries/ - List time entries
    POST /api/billing/time-entries/ - Create time entry
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'lawyer':
            entries = TimeEntry.objects.filter(lawyer=user)
        elif user.role == 'client':
            entries = TimeEntry.objects.filter(case__client=user, is_billable=True)
        else:  # admin
            entries = TimeEntry.objects.all()

        # Optional filters
        case_id = request.query_params.get('case_id')
        if case_id:
            entries = entries.filter(case_id=case_id)

        unbilled = request.query_params.get('unbilled', '').lower() == 'true'
        if unbilled:
            entries = entries.filter(invoiced=False)

        return Response(TimeEntryListSerializer(entries, many=True).data)

    def post(self, request):
        # Only lawyers can create time entries
        if request.user.role != 'lawyer':
            return Response(
                {'error': 'Only lawyers can log time'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreateTimeEntrySerializer(data=request.data)
        if serializer.is_valid():
            case_id = serializer.validated_data['case_id']

            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check lawyer is assigned to case
            if case.lawyer != request.user:
                return Response(
                    {'error': 'You are not assigned to this case'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Use lawyer's hourly rate if not specified
            hourly_rate = serializer.validated_data.get('hourly_rate') or request.user.hourly_rate

            entry = TimeEntry.objects.create(
                case=case,
                lawyer=request.user,
                date=serializer.validated_data['date'],
                hours=serializer.validated_data['hours'],
                description=serializer.validated_data['description'],
                hourly_rate=hourly_rate,
                is_billable=serializer.validated_data.get('is_billable', True)
            )

            return Response(
                TimeEntrySerializer(entry).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TimeEntryDetailView(APIView):
    """
    GET /api/billing/time-entries/<id>/
    PUT /api/billing/time-entries/<id>/
    DELETE /api/billing/time-entries/<id>/
    """
    permission_classes = [IsAuthenticated, IsLawyerOrAdmin]

    def get(self, request, entry_id):
        try:
            entry = TimeEntry.objects.get(id=entry_id)
            if request.user.role == 'lawyer' and entry.lawyer != request.user:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            return Response(TimeEntrySerializer(entry).data)
        except TimeEntry.DoesNotExist:
            return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, entry_id):
        try:
            entry = TimeEntry.objects.get(id=entry_id)
        except TimeEntry.DoesNotExist:
            return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

        if entry.lawyer != request.user and request.user.role != 'admin':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if entry.invoiced:
            return Response(
                {'error': 'Cannot edit invoiced entry'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update fields
        if 'date' in request.data:
            entry.date = request.data['date']
        if 'hours' in request.data:
            entry.hours = request.data['hours']
        if 'description' in request.data:
            entry.description = request.data['description']
        if 'hourly_rate' in request.data:
            entry.hourly_rate = request.data['hourly_rate']
        if 'is_billable' in request.data:
            entry.is_billable = request.data['is_billable']

        entry.save()
        return Response(TimeEntrySerializer(entry).data)

    def delete(self, request, entry_id):
        try:
            entry = TimeEntry.objects.get(id=entry_id)
        except TimeEntry.DoesNotExist:
            return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)

        if entry.lawyer != request.user and request.user.role != 'admin':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if entry.invoiced:
            return Response(
                {'error': 'Cannot delete invoiced entry'},
                status=status.HTTP_400_BAD_REQUEST
            )

        entry.delete()
        return Response({'message': 'Entry deleted'}, status=status.HTTP_204_NO_CONTENT)


class InvoiceListView(APIView):
    """
    GET /api/billing/invoices/ - List invoices
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'lawyer':
            invoices = Invoice.objects.filter(case__lawyer=user)
        elif user.role == 'client':
            invoices = Invoice.objects.filter(case__client=user).exclude(status='draft')
        else:  # admin
            invoices = Invoice.objects.all()

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            invoices = invoices.filter(status=status_filter)

        return Response(InvoiceListSerializer(invoices, many=True).data)


class GenerateInvoiceView(APIView):
    """
    POST /api/billing/invoices/generate/
    Generate invoice from unbilled time entries.
    """
    permission_classes = [IsAuthenticated, IsLawyerOrAdmin]

    def post(self, request):
        serializer = GenerateInvoiceSerializer(data=request.data)
        if serializer.is_valid():
            case_id = serializer.validated_data['case_id']

            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check access
            if request.user.role == 'lawyer' and case.lawyer != request.user:
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get unbilled entries
            entries = TimeEntry.objects.filter(
                case=case,
                invoiced=False,
                is_billable=True
            )

            if not entries.exists():
                return Response(
                    {'error': 'No unbilled entries for this case'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculate totals
            subtotal = sum(entry.amount for entry in entries)
            tax_rate = serializer.validated_data.get('tax_rate', 0)
            tax_amount = subtotal * (Decimal(str(tax_rate)) / 100)
            total = subtotal + tax_amount

            # Calculate due date
            due_days = serializer.validated_data.get('due_days', 30)
            due_date = timezone.now().date() + timedelta(days=due_days)

            # Calculate admin share (10%) and lawyer share (90%)
            admin_share = total * Decimal('0.10')
            lawyer_share = total - admin_share

            # Create invoice
            invoice = Invoice.objects.create(
                case=case,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                total_amount=total,
                admin_share=admin_share,
                lawyer_share=lawyer_share,
                status='sent',
                notes=serializer.validated_data.get('notes', ''),
                due_date=due_date
            )

            # Link entries and mark as invoiced
            invoice.entries.set(entries)
            entries.update(invoiced=True)

            return Response(
                InvoiceSerializer(invoice).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InvoiceDetailView(APIView):
    """
    GET /api/billing/invoices/<id>/
    PUT /api/billing/invoices/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        case = invoice.case

        # Access check
        if user.role == 'client' and case.client != user:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'lawyer' and case.lawyer != user:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Don't show draft to client
        if user.role == 'client' and invoice.status == 'draft':
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(InvoiceSerializer(invoice).data)

    def put(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user.role not in ['lawyer', 'admin']:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.role == 'lawyer' and invoice.case.lawyer != request.user:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Update fields
        if 'status' in request.data:
            invoice.status = request.data['status']
            if request.data['status'] == 'paid':
                invoice.paid_date = timezone.now().date()
        if 'notes' in request.data:
            invoice.notes = request.data['notes']
        if 'due_date' in request.data:
            invoice.due_date = request.data['due_date']

        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


class BillingSummaryView(APIView):
    """
    GET /api/billing/summary/
    Get billing summary/statistics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'lawyer':
            entries = TimeEntry.objects.filter(lawyer=user)
            invoices = Invoice.objects.filter(case__lawyer=user)
        elif user.role == 'client':
            entries = TimeEntry.objects.filter(case__client=user)
            invoices = Invoice.objects.filter(case__client=user).exclude(status='draft')
        else:
            entries = TimeEntry.objects.all()
            invoices = Invoice.objects.all()

        # Calculate stats
        total_hours = entries.filter(is_billable=True).aggregate(
            total=Sum('hours')
        )['total'] or 0

        unbilled_hours = entries.filter(is_billable=True, invoiced=False).aggregate(
            total=Sum('hours')
        )['total'] or 0

        total_billed = invoices.exclude(status__in=['draft', 'cancelled']).aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        total_paid = invoices.filter(status='paid').aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        outstanding = invoices.filter(status__in=['sent', 'overdue']).aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        # Admin revenue = 10% of total billed
        admin_revenue = invoices.exclude(status__in=['draft', 'cancelled']).aggregate(
            total=Sum('admin_share')
        )['total'] or 0

        # Admin paid revenue = 10% of paid invoices
        admin_paid_revenue = invoices.filter(status='paid').aggregate(
            total=Sum('admin_share')
        )['total'] or 0

        return Response({
            'total_hours': float(total_hours),
            'unbilled_hours': float(unbilled_hours),
            'total_billed': float(total_billed),
            'total_paid': float(total_paid),
            'outstanding': float(outstanding),
            'invoices_count': invoices.count(),
            'pending_invoices': invoices.filter(status__in=['sent', 'overdue']).count(),
            'admin_revenue': float(admin_revenue),
            'admin_paid_revenue': float(admin_paid_revenue),
        })
