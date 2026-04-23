from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView,
    ChangePasswordView, LawyerListView, UserListView, UserDetailView
)

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Profile endpoints
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # User management
    path('lawyers/', LawyerListView.as_view(), name='lawyer_list'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user_detail'),
]
