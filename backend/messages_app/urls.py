from django.urls import path
from .views import (
    SendMessageView, ConversationView, InboxView,
    SentMessagesView, MessageDetailView, UnreadCountView
)

urlpatterns = [
    path('send/', SendMessageView.as_view(), name='send_message'),
    path('inbox/', InboxView.as_view(), name='inbox'),
    path('sent/', SentMessagesView.as_view(), name='sent_messages'),
    path('unread-count/', UnreadCountView.as_view(), name='unread_count'),
    path('conversation/<int:case_id>/', ConversationView.as_view(), name='conversation'),
    path('<int:message_id>/', MessageDetailView.as_view(), name='message_detail'),
]
