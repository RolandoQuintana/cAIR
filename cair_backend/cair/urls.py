from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoryViewSet, MessageViewSet, ChapterViewSet

# Configure router with ViewSets
router = DefaultRouter()
router.register(r'stories', StoryViewSet, basename='story')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'chapters', ChapterViewSet, basename='chapter')

urlpatterns = [
    path('', include(router.urls)),
]