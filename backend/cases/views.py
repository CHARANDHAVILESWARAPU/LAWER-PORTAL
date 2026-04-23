from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from .models import Case, CaseNote
from .serializers import CaseSerializer, CaseListSerializer, CaseNoteSerializer
from accounts.permissions import IsAdmin


class CaseListCreateView(APIView):
    """
    GET /api/cases/ - List cases (filtered by user role)
    POST /api/cases/ - Create new case
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Filter based on role
        if user.role == 'client':
            cases = Case.objects.filter(client=user)
        elif user.role == 'lawyer':
            cases = Case.objects.filter(lawyer=user)
        else:  # admin
            cases = Case.objects.all()

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            cases = cases.filter(status=status_filter)

        serializer = CaseListSerializer(cases, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CaseSerializer(data=request.data)
        if serializer.is_valid():
            case = serializer.save()

            # Create initial note
            CaseNote.objects.create(
                case=case,
                author=request.user,
                content=f"Case created: {case.title}"
            )

            return Response(CaseSerializer(case).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CaseDetailView(APIView):
    """
    GET /api/cases/<id>/ - Get case details
    PUT /api/cases/<id>/ - Update case
    DELETE /api/cases/<id>/ - Delete case (admin only)
    """
    permission_classes = [IsAuthenticated]

    def get_case(self, case_id, user):
        """Get case with permission check."""
        try:
            case = Case.objects.get(id=case_id)
            # Check access
            if user.role == 'admin':
                return case
            if user.role == 'client' and case.client == user:
                return case
            if user.role == 'lawyer' and case.lawyer == user:
                return case
            return None
        except Case.DoesNotExist:
            return None

    def get(self, request, case_id):
        case = self.get_case(case_id, request.user)
        if not case:
            return Response({'error': 'Case not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        # Filter internal notes for clients
        serializer = CaseSerializer(case)
        data = serializer.data
        if request.user.role == 'client':
            data['notes'] = [n for n in data['notes'] if not n['is_internal']]

        return Response(data)

    def put(self, request, case_id):
        case = self.get_case(case_id, request.user)
        if not case:
            return Response({'error': 'Case not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        # Only lawyer or admin can update
        if request.user.role == 'client':
            return Response({'error': 'Clients cannot update cases'}, status=status.HTTP_403_FORBIDDEN)

        old_status = case.status
        serializer = CaseSerializer(case, data=request.data, partial=True)
        if serializer.is_valid():
            case = serializer.save()

            # Track status change
            if 'status' in request.data and request.data['status'] != old_status:
                if request.data['status'] == 'closed':
                    case.closed_at = timezone.now()
                    case.save()
                CaseNote.objects.create(
                    case=case,
                    author=request.user,
                    content=f"Status changed from {old_status} to {case.status}"
                )

            return Response(CaseSerializer(case).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, case_id):
        if request.user.role != 'admin':
            return Response({'error': 'Only admin can delete cases'}, status=status.HTTP_403_FORBIDDEN)

        try:
            case = Case.objects.get(id=case_id)
            case.delete()
            return Response({'message': 'Case deleted'}, status=status.HTTP_204_NO_CONTENT)
        except Case.DoesNotExist:
            return Response({'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)


class CaseNoteView(APIView):
    """
    GET /api/cases/<id>/notes/ - Get case notes
    POST /api/cases/<id>/notes/ - Add note to case
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response({'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)

        notes = case.notes.all()

        # Hide internal notes from clients
        if request.user.role == 'client':
            notes = notes.filter(is_internal=False)

        return Response(CaseNoteSerializer(notes, many=True).data)

    def post(self, request, case_id):
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response({'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only participants can add notes
        if request.user not in [case.client, case.lawyer] and request.user.role != 'admin':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Clients cannot add internal notes
        is_internal = request.data.get('is_internal', False)
        if request.user.role == 'client':
            is_internal = False

        note = CaseNote.objects.create(
            case=case,
            author=request.user,
            content=request.data.get('content', ''),
            is_internal=is_internal
        )

        return Response(CaseNoteSerializer(note).data, status=status.HTTP_201_CREATED)


class CaseStatusUpdateView(APIView):
    """
    POST /api/cases/<id>/status/
    Update case status (lawyer/admin only).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        if request.user.role == 'client':
            return Response({'error': 'Clients cannot update status'}, status=status.HTTP_403_FORBIDDEN)

        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response({'error': 'Case not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in dict(Case.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = case.status
        case.status = new_status

        if new_status == 'closed':
            case.closed_at = timezone.now()

        case.save()

        # Add note
        CaseNote.objects.create(
            case=case,
            author=request.user,
            content=f"Status changed from {old_status} to {new_status}"
        )

        return Response(CaseSerializer(case).data)


class CaseStatsView(APIView):
    """
    GET /api/cases/stats/
    Get case statistics for dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'client':
            cases = Case.objects.filter(client=user)
        elif user.role == 'lawyer':
            cases = Case.objects.filter(lawyer=user)
        else:
            cases = Case.objects.all()

        stats = {
            'total': cases.count(),
            'open': cases.filter(status='open').count(),
            'in_progress': cases.filter(status='in_progress').count(),
            'pending': cases.filter(status='pending').count(),
            'closed': cases.filter(status='closed').count(),
        }

        return Response(stats)
