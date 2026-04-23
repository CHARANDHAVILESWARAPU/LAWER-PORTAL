from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from .models import Document
from .serializers import DocumentSerializer, DocumentListSerializer, UploadDocumentSerializer
from cases.models import Case


class UploadDocumentView(APIView):
    """
    POST /api/documents/upload/
    Upload a document to a case.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = UploadDocumentSerializer(data=request.data)
        if serializer.is_valid():
            case_id = serializer.validated_data['case_id']
            file = serializer.validated_data['file']

            # Validate case access
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

            # Create document
            document = Document.objects.create(
                case=case,
                uploaded_by=request.user,
                file=file,
                original_filename=file.name,
                file_size=file.size,
                file_type=file.content_type or 'application/octet-stream',
                category=serializer.validated_data.get('category', 'other'),
                description=serializer.validated_data.get('description', ''),
                is_confidential=serializer.validated_data.get('is_confidential', False)
            )

            return Response(
                DocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentListView(APIView):
    """
    GET /api/documents/case/<case_id>/
    List all documents for a case.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        # Validate case access
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check access
        if request.user not in [case.client, case.lawyer] and request.user.role != 'admin':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        documents = Document.objects.filter(case=case)

        # Filter confidential docs for clients
        if request.user.role == 'client':
            documents = documents.filter(is_confidential=False)

        # Optional category filter
        category = request.query_params.get('category')
        if category:
            documents = documents.filter(category=category)

        return Response(DocumentListSerializer(documents, many=True).data)


class DocumentDetailView(APIView):
    """
    GET /api/documents/<id>/
    DELETE /api/documents/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get_document(self, doc_id, user):
        """Get document with access check."""
        try:
            document = Document.objects.get(id=doc_id)
            case = document.case

            # Admin has full access
            if user.role == 'admin':
                return document

            # Check if user is case participant
            if user not in [case.client, case.lawyer]:
                return None

            # Check confidential access
            if document.is_confidential and user.role == 'client':
                return None

            return document
        except Document.DoesNotExist:
            return None

    def get(self, request, doc_id):
        document = self.get_document(doc_id, request.user)
        if not document:
            return Response(
                {'error': 'Document not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(DocumentSerializer(document).data)

    def delete(self, request, doc_id):
        document = self.get_document(doc_id, request.user)
        if not document:
            return Response(
                {'error': 'Document not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only uploader, lawyer, or admin can delete
        if request.user != document.uploaded_by and request.user.role not in ['lawyer', 'admin']:
            return Response(
                {'error': 'Only uploader or lawyer can delete'},
                status=status.HTTP_403_FORBIDDEN
            )

        document.delete()
        return Response({'message': 'Document deleted'}, status=status.HTTP_204_NO_CONTENT)


class DocumentDownloadView(APIView):
    """
    GET /api/documents/download/<id>/
    Download a document file.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            document = Document.objects.get(id=doc_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        case = document.case
        user = request.user

        # Access check
        if user.role != 'admin' and user not in [case.client, case.lawyer]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Confidential check
        if document.is_confidential and user.role == 'client':
            return Response(
                {'error': 'Access denied to confidential document'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Return file
        try:
            return FileResponse(
                document.file.open('rb'),
                as_attachment=True,
                filename=document.original_filename
            )
        except FileNotFoundError:
            return Response(
                {'error': 'File not found on server'},
                status=status.HTTP_404_NOT_FOUND
            )


class MyDocumentsView(APIView):
    """
    GET /api/documents/my/
    Get all documents uploaded by the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        documents = Document.objects.filter(uploaded_by=request.user)
        return Response(DocumentListSerializer(documents, many=True).data)
