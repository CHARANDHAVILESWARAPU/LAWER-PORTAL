from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .models import Appointment
from .serializers import (
    AppointmentSerializer, AppointmentListSerializer, CreateAppointmentSerializer
)
from cases.models import Case


class AppointmentListCreateView(APIView):
    """
    GET /api/appointments/ - List appointments
    POST /api/appointments/ - Create appointment
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Filter by role
        if user.role == 'client':
            appointments = Appointment.objects.filter(case__client=user)
        elif user.role == 'lawyer':
            appointments = Appointment.objects.filter(case__lawyer=user)
        else:  # admin
            appointments = Appointment.objects.all()

        # Optional filters
        status_filter = request.query_params.get('status')
        if status_filter:
            appointments = appointments.filter(status=status_filter)

        # Upcoming only
        upcoming = request.query_params.get('upcoming', '').lower() == 'true'
        if upcoming:
            appointments = appointments.filter(datetime__gte=timezone.now())

        return Response(AppointmentListSerializer(appointments, many=True).data)

    def post(self, request):
        serializer = CreateAppointmentSerializer(data=request.data)
        if serializer.is_valid():
            case_id = serializer.validated_data['case_id']

            # Validate case
            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check user is participant
            if request.user not in [case.client, case.lawyer] and request.user.role != 'admin':
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate datetime is in future
            appointment_time = serializer.validated_data['datetime']
            if appointment_time < timezone.now():
                return Response(
                    {'error': 'Appointment must be in the future'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create appointment
            appointment = Appointment.objects.create(
                case=case,
                scheduled_by=request.user,
                datetime=appointment_time,
                duration=serializer.validated_data.get('duration', 60),
                appointment_type=serializer.validated_data.get('appointment_type', 'consultation'),
                location=serializer.validated_data.get('location', ''),
                notes=serializer.validated_data.get('notes', '')
            )

            return Response(
                AppointmentSerializer(appointment).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AppointmentDetailView(APIView):
    """
    GET /api/appointments/<id>/
    PUT /api/appointments/<id>/
    DELETE /api/appointments/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get_appointment(self, appointment_id, user):
        """Get appointment with access check."""
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            case = appointment.case

            if user.role == 'admin':
                return appointment
            if user in [case.client, case.lawyer]:
                return appointment
            return None
        except Appointment.DoesNotExist:
            return None

    def get(self, request, appointment_id):
        appointment = self.get_appointment(appointment_id, request.user)
        if not appointment:
            return Response(
                {'error': 'Appointment not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(AppointmentSerializer(appointment).data)

    def put(self, request, appointment_id):
        appointment = self.get_appointment(appointment_id, request.user)
        if not appointment:
            return Response(
                {'error': 'Appointment not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update fields
        if 'datetime' in request.data:
            appointment.datetime = request.data['datetime']
        if 'duration' in request.data:
            appointment.duration = request.data['duration']
        if 'location' in request.data:
            appointment.location = request.data['location']
        if 'notes' in request.data:
            appointment.notes = request.data['notes']
        if 'appointment_type' in request.data:
            appointment.appointment_type = request.data['appointment_type']

        appointment.save()
        return Response(AppointmentSerializer(appointment).data)

    def delete(self, request, appointment_id):
        appointment = self.get_appointment(appointment_id, request.user)
        if not appointment:
            return Response(
                {'error': 'Appointment not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        appointment.delete()
        return Response({'message': 'Appointment deleted'}, status=status.HTTP_204_NO_CONTENT)


class AppointmentStatusView(APIView):
    """
    POST /api/appointments/<id>/status/
    Update appointment status.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        case = appointment.case
        user = request.user

        # Check access
        if user.role != 'admin' and user not in [case.client, case.lawyer]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        new_status = request.data.get('status')
        if new_status not in dict(Appointment.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        appointment.status = new_status
        appointment.save()

        return Response(AppointmentSerializer(appointment).data)


class UpcomingAppointmentsView(APIView):
    """
    GET /api/appointments/upcoming/
    Get upcoming appointments for next 7 days.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        week_later = now + timedelta(days=7)

        if user.role == 'client':
            appointments = Appointment.objects.filter(
                case__client=user,
                datetime__gte=now,
                datetime__lte=week_later,
                status__in=['scheduled', 'confirmed']
            )
        elif user.role == 'lawyer':
            appointments = Appointment.objects.filter(
                case__lawyer=user,
                datetime__gte=now,
                datetime__lte=week_later,
                status__in=['scheduled', 'confirmed']
            )
        else:
            appointments = Appointment.objects.filter(
                datetime__gte=now,
                datetime__lte=week_later,
                status__in=['scheduled', 'confirmed']
            )

        return Response(AppointmentListSerializer(appointments, many=True).data)


class CaseAppointmentsView(APIView):
    """
    GET /api/appointments/case/<case_id>/
    Get all appointments for a specific case.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        if user.role != 'admin' and user not in [case.client, case.lawyer]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        appointments = Appointment.objects.filter(case=case)
        return Response(AppointmentListSerializer(appointments, many=True).data)
