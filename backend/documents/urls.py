from django.urls import path
from .views import (
    UploadDocumentView, DocumentListView, DocumentDetailView,
    DocumentDownloadView, MyDocumentsView
)

urlpatterns = [
    path('upload/', UploadDocumentView.as_view(), name='upload_document'),
    path('my/', MyDocumentsView.as_view(), name='my_documents'),
    path('case/<int:case_id>/', DocumentListView.as_view(), name='case_documents'),
    path('<int:doc_id>/', DocumentDetailView.as_view(), name='document_detail'),
    path('download/<int:doc_id>/', DocumentDownloadView.as_view(), name='download_document'),
]
