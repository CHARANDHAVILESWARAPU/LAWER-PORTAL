from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer, SendMessageSerializer, MessageListSerializer
from .encryption import encrypt_message
from cases.models import Case
from accounts.models import User


class SendMessageView(APIView):
    """
    POST /api/messages/send/
    Send an encrypted message.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        if serializer.is_valid():
            case_id = serializer.validated_data['case_id']
            receiver_id = serializer.validated_data['receiver_id']
            content = serializer.validated_data['content']

            # Validate case exists and user has access
            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check sender is participant
            if request.user not in [case.client, case.lawyer]:
                return Response(
                    {'error': 'You are not a participant in this case'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate receiver
            try:
                receiver = User.objects.get(id=receiver_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Receiver not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Receiver must also be participant
            if receiver not in [case.client, case.lawyer]:
                return Response(
                    {'error': 'Receiver is not a participant in this case'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Encrypt and save message
            encrypted_content = encrypt_message(content)
            message = Message.objects.create(
                case=case,
                sender=request.user,
                receiver=receiver,
                encrypted_content=encrypted_content
            )

            return Response(
                MessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConversationView(APIView):
    """
    GET /api/messages/conversation/<case_id>/
    Get all messages in a case conversation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        # Validate access
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check user is participant (or admin)
        if request.user.role != 'admin' and request.user not in [case.client, case.lawyer]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get messages
        messages = Message.objects.filter(case=case).order_by('created_at')

        # Mark received messages as read
        messages.filter(receiver=request.user, is_read=False).update(is_read=True)

        return Response(MessageSerializer(messages, many=True).data)


class InboxView(APIView):
    """
    GET /api/messages/inbox/
    Get user's inbox (received messages).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = Message.objects.filter(
            receiver=request.user
        ).order_by('-created_at')

        # Optional: filter unread only
        unread_only = request.query_params.get('unread', '').lower() == 'true'
        if unread_only:
            messages = messages.filter(is_read=False)

        return Response(MessageListSerializer(messages, many=True).data)


class SentMessagesView(APIView):
    """
    GET /api/messages/sent/
    Get user's sent messages.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = Message.objects.filter(
            sender=request.user
        ).order_by('-created_at')

        return Response(MessageListSerializer(messages, many=True).data)


class MessageDetailView(APIView):
    """
    GET /api/messages/<id>/
    Get single message details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response(
                {'error': 'Message not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check access
        if request.user not in [message.sender, message.receiver] and request.user.role != 'admin':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mark as read if receiver
        if message.receiver == request.user and not message.is_read:
            message.is_read = True
            message.save()

        return Response(MessageSerializer(message).data)


class UnreadCountView(APIView):
    """
    GET /api/messages/unread-count/
    Get count of unread messages.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            receiver=request.user,
            is_read=False
        ).count()

        return Response({'unread_count': count})
