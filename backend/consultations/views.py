from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import ConsultationSlot, Consultation, CallLog
from .serializers import (
    ConsultationSlotSerializer,
    ConsultationListSerializer,
    ConsultationDetailSerializer,
    CallLogSerializer,
)
from .services import validate_meeting_token
from accounts.permissions import IsLawyer
from cases.models import Case


# ===================== SLOTS =====================

class SlotListCreateView(APIView):
    """
    GET  /api/consultations/slots/          - Browse available slots
    GET  /api/consultations/slots/?lawyer=id - Filter by lawyer
    POST /api/consultations/slots/          - Lawyer creates a slot
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lawyer_id = request.query_params.get('lawyer')
        if lawyer_id:
            qs = ConsultationSlot.objects.filter(lawyer_id=lawyer_id, is_booked=False)
        elif request.user.role == 'lawyer':
            qs = ConsultationSlot.objects.filter(lawyer=request.user)
        else:
            qs = ConsultationSlot.objects.filter(is_booked=False, date__gte=timezone.now().date())
        return Response(ConsultationSlotSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'lawyer':
            return Response(
                {'error': 'Only lawyers can create slots'},
                status=status.HTTP_403_FORBIDDEN
            )
        data = {**request.data, 'lawyer': request.user.id}
        serializer = ConsultationSlotSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SlotDeleteView(APIView):
    """DELETE /api/consultations/slots/<id>/ - Lawyer removes an unbooked slot."""
    permission_classes = [IsAuthenticated, IsLawyer]

    def delete(self, request, slot_id):
        try:
            slot = ConsultationSlot.objects.get(
                id=slot_id, lawyer=request.user, is_booked=False
            )
        except ConsultationSlot.DoesNotExist:
            return Response(
                {'error': 'Slot not found or already booked'},
                status=status.HTTP_404_NOT_FOUND
            )
        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ===================== CONSULTATIONS =====================

class ConsultationListView(APIView):
    """GET /api/consultations/ - List consultations for current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'client':
            qs = Consultation.objects.filter(client=user)
        elif user.role == 'lawyer':
            qs = Consultation.objects.filter(lawyer=user)
        else:
            qs = Consultation.objects.all()

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(ConsultationListSerializer(qs, many=True).data)


class BookConsultationView(APIView):
    """
    POST /api/consultations/book/
    Client selects a slot, optionally links a case, and books.
    Status starts as 'pending' until the lawyer approves.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        slot_id = request.data.get('slot_id')
        case_id = request.data.get('case_id')
        subject = request.data.get('subject', '')
        notes = request.data.get('notes', '')

        # Validate slot
        try:
            slot = ConsultationSlot.objects.get(id=slot_id, is_booked=False)
        except ConsultationSlot.DoesNotExist:
            return Response(
                {'error': 'This slot is no longer available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate case if provided
        case = None
        if case_id:
            try:
                case = Case.objects.get(id=case_id)
                if request.user not in [case.client, case.lawyer] and request.user.role != 'admin':
                    return Response(
                        {'error': 'You are not a participant of this case'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Case.DoesNotExist:
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Book it
        consultation = Consultation.objects.create(
            client=request.user,
            lawyer=slot.lawyer,
            case=case,
            slot=slot,
            subject=subject,
            notes=notes,
        )
        slot.is_booked = True
        slot.save()

        return Response(
            ConsultationDetailSerializer(consultation).data,
            status=status.HTTP_201_CREATED
        )


class ConsultationDetailView(APIView):
    """GET /api/consultations/<id>/ - Full detail with call logs."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            consultation = Consultation.objects.get(id=pk)
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        if user.role != 'admin' and user != consultation.client and user != consultation.lawyer:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(ConsultationDetailSerializer(consultation).data)


class ConsultationStatusView(APIView):
    """
    POST /api/consultations/<id>/status/
    Lawyer approves/rejects. Either party can cancel.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            consultation = Consultation.objects.get(id=pk)
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        new_status = request.data.get('status')
        valid_statuses = [c[0] for c in Consultation.STATUS_CHOICES]

        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only lawyer can approve/reject
        if new_status in ('approved', 'rejected') and user != consultation.lawyer:
            return Response(
                {'error': 'Only the assigned lawyer can approve or reject'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Either participant can cancel
        if new_status == 'cancelled' and user not in (consultation.client, consultation.lawyer) and user.role != 'admin':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Free up the slot if rejecting/cancelling
        if new_status in ('rejected', 'cancelled') and consultation.slot:
            consultation.slot.is_booked = False
            consultation.slot.save()

        consultation.status = new_status
        consultation.save()
        return Response(ConsultationDetailSerializer(consultation).data)


# ===================== MEETING JOIN =====================

class JoinMeetingView(APIView):
    """
    GET /api/consultations/join/<meeting_id>/?token=<token>
    Validates:
      1. The meeting exists
      2. The token matches (HMAC verification)
      3. The user is an authorized participant
      4. The consultation is in an active status
    Returns meeting details needed by the Jitsi client.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, meeting_id):
        try:
            consultation = Consultation.objects.get(meeting_id=meeting_id)
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Meeting not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Token validation
        token = request.query_params.get('token', '')
        if not validate_meeting_token(consultation.meeting_id, token):
            return Response(
                {'error': 'Invalid or expired meeting link'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Participant check
        user = request.user
        if user != consultation.client and user != consultation.lawyer and user.role != 'admin':
            return Response(
                {'error': 'You are not authorized to join this meeting'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Status check
        if consultation.status in ('rejected', 'cancelled'):
            return Response(
                {'error': 'This consultation has been cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto-transition from approved to in_progress
        if consultation.status == 'approved':
            consultation.status = 'in_progress'
            consultation.save()

        # Create call log entry for this participant
        CallLog.objects.create(
            consultation=consultation,
            participant=user,
            joined_at=timezone.now(),
        )

        return Response({
            'consultation': ConsultationDetailSerializer(consultation).data,
            'room_name': consultation.meeting_url,
            'user_name': user.full_name,
            'user_role': user.role,
        })


class LeaveMeetingView(APIView):
    """
    POST /api/consultations/leave/<meeting_id>/
    Records when a participant leaves. Calculates duration.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, meeting_id):
        try:
            consultation = Consultation.objects.get(meeting_id=meeting_id)
        except Consultation.DoesNotExist:
            return Response(
                {'error': 'Meeting not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the most recent call log for this user (without a left_at)
        log = CallLog.objects.filter(
            consultation=consultation,
            participant=request.user,
            left_at__isnull=True,
        ).order_by('-joined_at').first()

        if log:
            log.left_at = timezone.now()
            if log.joined_at:
                log.duration_seconds = int(
                    (log.left_at - log.joined_at).total_seconds()
                )
            log.save()

        # If both participants have left, mark as completed
        active_logs = CallLog.objects.filter(
            consultation=consultation,
            left_at__isnull=True,
        ).count()

        if active_logs == 0 and consultation.status == 'in_progress':
            consultation.status = 'completed'
            consultation.save()

        return Response({'message': 'Left meeting', 'status': consultation.status})


class ConsultationHistoryView(APIView):
    """
    GET /api/consultations/history/
    Returns completed consultations with call duration info.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'client':
            qs = Consultation.objects.filter(client=user, status='completed')
        elif user.role == 'lawyer':
            qs = Consultation.objects.filter(lawyer=user, status='completed')
        else:
            qs = Consultation.objects.filter(status='completed')

        data = []
        for c in qs:
            logs = c.call_logs.all()
            total_duration = sum(l.duration_seconds for l in logs)
            entry = ConsultationListSerializer(c).data
            entry['total_duration_seconds'] = total_duration
            entry['total_duration_display'] = f"{total_duration // 60}m {total_duration % 60}s"
            entry['participants'] = CallLogSerializer(logs, many=True).data
            data.append(entry)

        return Response(data)
