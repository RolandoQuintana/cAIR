from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoryViewSet, MessageViewSet, ChapterViewSet, AIResponseViewSet

# Configure router with ViewSets
router = DefaultRouter()
router.register(r'projects', StoryViewSet, basename='project')
router.register(r'checklist', ChapterViewSet, basename='checklist')
router.register(r'ai', AIResponseViewSet, basename='ai')

# Custom URL patterns for nested endpoints
urlpatterns = [
    path('', include(router.urls)),
    # Nested endpoints for project-specific resources
    path('projects/<int:project_pk>/messages/', MessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='project-messages-list'),
    path('projects/<int:project_pk>/messages/<int:pk>/', MessageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='project-messages-detail'),
    path('projects/<int:project_pk>/checklist/', ChapterViewSet.as_view({'get': 'list', 'post': 'create'}), name='project-checklist-list'),
]