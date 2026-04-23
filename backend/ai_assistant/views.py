from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .services import get_ai_response


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_sessions(request):
    """
    GET  - List all chat sessions for the logged-in user.
    POST - Create a new chat session.
    """
    if request.method == 'GET':
        sessions = ChatSession.objects.filter(user=request.user)
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    # POST
    session = ChatSession.objects.create(
        user=request.user,
        title=request.data.get('title', 'New Chat')
    )
    return Response(
        ChatSessionSerializer(session).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_session_detail(request, session_id):
    """
    GET    - Retrieve full message history for a session.
    DELETE - Delete a session and all its messages.
    """
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'DELETE':
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # GET - return messages
    messages = session.messages.all()
    return Response({
        'session': ChatSessionSerializer(session).data,
        'messages': ChatMessageSerializer(messages, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, session_id):
    """
    Send a user message and receive the AI response.
    Stores both in the database for conversation memory.

    Request body:
        message (str): The user's message text
        input_type (str): 'text' or 'voice'
    """
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    user_content = request.data.get('message', '').strip()
    input_type = request.data.get('input_type', 'text')

    if not user_content:
        return Response(
            {'error': 'Message cannot be empty'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Save user message
    user_msg = ChatMessage.objects.create(
        session=session,
        role='user',
        content=user_content,
        input_type=input_type,
    )

    # 2. Load conversation history for memory
    history = list(session.messages.all())

    # 3. Get AI response (passes user context + history)
    try:
        ai_content = get_ai_response(request.user, user_content, history)
    except Exception as e:
        ai_content = (
            "I'm sorry, I'm having trouble connecting to the AI service "
            "right now. Please try again in a moment."
        )

    # 4. Save assistant response
    ai_msg = ChatMessage.objects.create(
        session=session,
        role='assistant',
        content=ai_content,
    )

    # 5. Auto-title session from first user message
    if session.title == 'New Chat':
        session.title = user_content[:80]
        session.save(update_fields=['title', 'updated_at'])
    else:
        session.save(update_fields=['updated_at'])

    return Response({
        'user_message': ChatMessageSerializer(user_msg).data,
        'ai_message': ChatMessageSerializer(ai_msg).data,
    })
