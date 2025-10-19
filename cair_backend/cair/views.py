from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Story, Message, Chapter
from .serializers import (
    StorySerializer,
    StoryListSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    ChapterSerializer
)


class StoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Story instances.
    Provides CRUD operations with progress calculation.
    """
    queryset = Story.objects.all()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return StoryListSerializer
        return StorySerializer
    
    def perform_create(self, serializer):
        """Create a new story and ensure progress is calculated."""
        story = serializer.save()
        story.update_progress()
    
    def perform_update(self, serializer):
        """Update story and recalculate progress."""
        story = serializer.save()
        story.update_progress()
    
    @action(detail=True, methods=['post'])
    def recalculate_progress(self, request, pk=None):
        """
        Manually recalculate and update story progress.
        """
        story = self.get_object()
        old_progress = story.progress
        story.update_progress()
        
        return Response({
            'id': story.id,
            'old_progress': old_progress,
            'new_progress': story.progress,
            'message': 'Progress recalculated successfully'
        })
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        Get story summary with counts and progress information.
        """
        story = self.get_object()
        
        total_messages = story.message_set.count()
        user_messages = story.message_set.filter(role='user').count()
        assistant_messages = story.message_set.filter(role='assistant').count()
        
        total_chapters = story.chapter_set.count()
        completed_chapters = story.chapter_set.filter(completed=True).count()
        pending_chapters = total_chapters - completed_chapters
        
        return Response({
            'story': {
                'id': story.id,
                'title': story.title,
                'type': story.type,
                'progress': story.progress,
                'created_at': story.created_at,
                'updated_at': story.updated_at,
            },
            'messages': {
                'total': total_messages,
                'user': user_messages,
                'assistant': assistant_messages,
            },
            'chapters': {
                'total': total_chapters,
                'completed': completed_chapters,
                'pending': pending_chapters,
                'progress_percentage': round(story.progress * 100, 1),
            }
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete story with cascade deletion of related objects.
        """
        story = self.get_object()
        story_title = story.title
        
        # Django will handle cascade deletion automatically due to ForeignKey relationships
        response = super().destroy(request, *args, **kwargs)
        
        return Response({
            'message': f'Story "{story_title}" and all related data deleted successfully'
        }, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Message instances.
    Provides CRUD operations for story messages.
    """
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        """Filter messages by story if story_id is provided."""
        queryset = Message.objects.all()
        story_id = self.request.query_params.get('story_id')
        if story_id:
            queryset = queryset.filter(story_id=story_id)
        return queryset.order_by('created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    @action(detail=False, methods=['get'])
    def by_story(self, request):
        """
        Get all messages for a specific story.
        Requires 'story_id' query parameter.
        """
        story_id = request.query_params.get('story_id')
        if not story_id:
            return Response(
                {'error': 'story_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Response(
                {'error': 'Story not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        messages = Message.objects.filter(story=story).order_by('created_at')
        serializer = self.get_serializer(messages, many=True)
        
        return Response({
            'story': {
                'id': story.id,
                'title': story.title,
                'type': story.type,
            },
            'messages': serializer.data,
            'total_count': messages.count()
        })
    
    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """
        Send a user message and prepare for AI response.
        This endpoint will be extended in task 4 for AI integration.
        """
        serializer = MessageCreateSerializer(data=request.data)
        if serializer.is_valid():
            message = serializer.save()
            
            # Return the created message
            response_serializer = MessageSerializer(message)
            return Response({
                'message': response_serializer.data,
                'status': 'Message sent successfully',
                'ai_response_pending': True
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChapterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Chapter instances.
    Provides CRUD operations for story chapters.
    """
    serializer_class = ChapterSerializer
    
    def get_queryset(self):
        """Filter chapters by story if story_id is provided."""
        queryset = Chapter.objects.all()
        story_id = self.request.query_params.get('story_id')
        if story_id:
            queryset = queryset.filter(story_id=story_id)
        return queryset.order_by('order', 'created_at')
    
    def perform_update(self, serializer):
        """Update chapter and trigger story progress recalculation."""
        chapter = serializer.save()
        # Progress is automatically updated via the model's save method
    
    @action(detail=False, methods=['get'])
    def by_story(self, request):
        """
        Get all chapters for a specific story.
        Requires 'story_id' query parameter.
        """
        story_id = request.query_params.get('story_id')
        if not story_id:
            return Response(
                {'error': 'story_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Response(
                {'error': 'Story not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        chapters = Chapter.objects.filter(story=story).order_by('order', 'created_at')
        serializer = self.get_serializer(chapters, many=True)
        
        total_chapters = chapters.count()
        completed_chapters = chapters.filter(completed=True).count()
        progress = (completed_chapters / total_chapters * 100) if total_chapters > 0 else 0
        
        return Response({
            'story': {
                'id': story.id,
                'title': story.title,
                'type': story.type,
            },
            'chapters': serializer.data,
            'summary': {
                'total_chapters': total_chapters,
                'completed_chapters': completed_chapters,
                'pending_chapters': total_chapters - completed_chapters,
                'progress_percentage': round(progress, 1)
            }
        })
    
    @action(detail=True, methods=['post'])
    def toggle_completion(self, request, pk=None):
        """
        Toggle the completion status of a chapter.
        """
        chapter = self.get_object()
        chapter.completed = not chapter.completed
        chapter.save()
        
        serializer = self.get_serializer(chapter)
        return Response({
            'chapter': serializer.data,
            'message': f'Chapter marked as {"completed" if chapter.completed else "incomplete"}'
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Bulk update multiple chapters.
        Expects a list of chapters with id and completion status.
        """
        chapters_data = request.data.get('chapters', [])
        if not chapters_data:
            return Response(
                {'error': 'chapters list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_chapters = []
        errors = []
        
        with transaction.atomic():
            for chapter_data in chapters_data:
                chapter_id = chapter_data.get('id')
                completed = chapter_data.get('completed')
                
                if chapter_id is None or completed is None:
                    errors.append(f'Chapter missing id or completed status: {chapter_data}')
                    continue
                
                try:
                    chapter = Chapter.objects.get(id=chapter_id)
                    chapter.completed = completed
                    chapter.save()
                    updated_chapters.append(chapter)
                except Chapter.DoesNotExist:
                    errors.append(f'Chapter with id {chapter_id} not found')
        
        serializer = self.get_serializer(updated_chapters, many=True)
        
        response_data = {
            'updated_chapters': serializer.data,
            'updated_count': len(updated_chapters)
        }
        
        if errors:
            response_data['errors'] = errors
        
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder chapters within a story.
        Expects a list of chapter IDs in the desired order.
        """
        chapter_ids = request.data.get('chapter_ids', [])
        if not chapter_ids:
            return Response(
                {'error': 'chapter_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_chapters = []
        errors = []
        
        with transaction.atomic():
            for index, chapter_id in enumerate(chapter_ids):
                try:
                    chapter = Chapter.objects.get(id=chapter_id)
                    chapter.order = index
                    chapter.save()
                    updated_chapters.append(chapter)
                except Chapter.DoesNotExist:
                    errors.append(f'Chapter with id {chapter_id} not found')
        
        serializer = self.get_serializer(updated_chapters, many=True)
        
        response_data = {
            'reordered_chapters': serializer.data,
            'updated_count': len(updated_chapters)
        }
        
        if errors:
            response_data['errors'] = errors
        
        return Response(response_data)