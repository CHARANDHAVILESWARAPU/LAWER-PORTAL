from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/messages/', include('messages_app.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/ai/', include('ai_assistant.urls')),
    path('api/consultations/', include('consultations.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
