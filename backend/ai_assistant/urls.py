from django.urls import path
from . import views

urlpatterns = [
    path('sessions/', views.chat_sessions, name='ai-chat-sessions'),
    path('sessions/<int:session_id>/', views.chat_session_detail, name='ai-chat-detail'),
    path('sessions/<int:session_id>/send/', views.send_message, name='ai-send-message'),
]
