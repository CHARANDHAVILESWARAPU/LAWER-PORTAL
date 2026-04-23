from rest_framework.permissions import BasePermission


class IsClient(BasePermission):
    """Allow access only to clients."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'client'


class IsLawyer(BasePermission):
    """Allow access only to lawyers."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'lawyer'


class IsAdmin(BasePermission):
    """Allow access only to admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsLawyerOrAdmin(BasePermission):
    """Allow access to lawyers and admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['lawyer', 'admin']


class IsOwnerOrAdmin(BasePermission):
    """Allow access to object owner or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj == request.user or getattr(obj, 'user', None) == request.user
