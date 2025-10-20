from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.conf import settings
import logging
from .models import Story, Message, Chapter
from .serializers import (
    StorySerializer,
    StoryListSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    ChapterSerializer
)
from .services import ai_service

logger = logging.getLogger(__name__)


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
        """Filter messages by story/project."""
        queryset = Message.objects.all()
        
        # Handle nested URL parameter (project_pk)
        project_pk = self.kwargs.get('project_pk')
        if project_pk:
            queryset = queryset.filter(story_id=project_pk)
        else:
            # Handle query parameter for backward compatibility
            story_id = self.request.query_params.get('story_id')
            if story_id:
                queryset = queryset.filter(story_id=story_id)
        
        return queryset.order_by('created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new message and generate AI response if it's a user message.
        This handles the frontend's expectation of sending messages to /projects/{id}/messages/
        """
        project_pk = self.kwargs.get('project_pk')
        if not project_pk:
            return Response(
                {'error': 'project_pk is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            story = Story.objects.get(id=project_pk)
        except Story.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Add the story to the request data
        data = request.data.copy()
        data['story'] = story.id
        
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Save the user message
                user_message = serializer.save()
                
                # Get conversation history for context
                conversation_history = []
                previous_messages = Message.objects.filter(story=story).order_by('created_at')
                
                for msg in previous_messages:
                    conversation_history.append({
                        'role': msg.role,
                        'content': msg.content
                    })
                
                # Generate AI response
                ai_result = ai_service.generate_response(
                    story_type=story.type,
                    conversation_history=conversation_history[:-1],  # Exclude the just-added user message
                    user_message=user_message.content
                )
                
                # Create AI response message
                ai_message = Message.objects.create(
                    story=story,
                    role='assistant',
                    content=ai_result['response']
                )
                
                # Create suggested checklist items
                created_chapters = []
                for item_description in ai_result.get('suggested_checklist_items', []):
                    if item_description.strip():
                        # Get the next order number
                        max_order = Chapter.objects.filter(story=story).aggregate(
                            max_order=models.Max('order')
                        )['max_order'] or 0
                        
                        chapter = Chapter.objects.create(
                            story=story,
                            title=item_description[:200],  # Use description as title
                            description=f"Suggested by AI: {item_description}",
                            order=max_order + 1
                        )
                        created_chapters.append(chapter)
                
                # Update story progress
                story.update_progress()
                
                # Return response in format expected by frontend
                return Response({
                    'message': MessageSerializer(ai_message).data,
                    'checklist_updates': ChapterSerializer(created_chapters, many=True).data
                }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error in create message: {str(e)}")
            return Response({
                'error': 'An error occurred while processing your message',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
        Send a user message and get AI response with potential checklist updates.
        """
        serializer = MessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Save the user message
                user_message = serializer.save()
                story = user_message.story
                
                # Get conversation history for context
                conversation_history = []
                previous_messages = Message.objects.filter(story=story).order_by('created_at')
                
                for msg in previous_messages:
                    conversation_history.append({
                        'role': msg.role,
                        'content': msg.content
                    })
                
                # Generate AI response
                ai_result = ai_service.generate_response(
                    story_type=story.type,
                    conversation_history=conversation_history[:-1],  # Exclude the just-added user message
                    user_message=user_message.content
                )
                
                # Create AI response message
                ai_message = Message.objects.create(
                    story=story,
                    role='assistant',
                    content=ai_result['response']
                )
                
                # Create suggested checklist items
                created_chapters = []
                for item_description in ai_result.get('suggested_checklist_items', []):
                    if item_description.strip():
                        # Get the next order number
                        max_order = Chapter.objects.filter(story=story).aggregate(
                            max_order=models.Max('order')
                        )['max_order'] or 0
                        
                        chapter = Chapter.objects.create(
                            story=story,
                            title=item_description[:200],  # Use description as title
                            description=f"Suggested by AI: {item_description}",
                            order=max_order + 1
                        )
                        created_chapters.append(chapter)
                
                # Update story progress
                story.update_progress()
                
                # Prepare response data
                user_message_data = MessageSerializer(user_message).data
                ai_message_data = MessageSerializer(ai_message).data
                chapter_data = ChapterSerializer(created_chapters, many=True).data
                
                response_data = {
                    'user_message': user_message_data,
                    'ai_message': ai_message_data,
                    'new_chapters': chapter_data,
                    'chapters_created': len(created_chapters),
                    'ai_service_success': ai_result['success'],
                    'story_progress': story.progress
                }
                
                if not ai_result['success']:
                    response_data['ai_service_error'] = ai_result.get('error')
                    logger.warning(f"AI service error for story {story.id}: {ai_result.get('error')}")
                
                return Response(response_data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error in send_message: {str(e)}")
            return Response({
                'error': 'An error occurred while processing your message',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChapterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Chapter instances.
    Provides CRUD operations for story chapters/checklist items.
    """
    serializer_class = ChapterSerializer
    
    def get_queryset(self):
        """Filter chapters by story/project."""
        queryset = Chapter.objects.all()
        
        # Handle nested URL parameter (project_pk)
        project_pk = self.kwargs.get('project_pk')
        if project_pk:
            queryset = queryset.filter(story_id=project_pk)
        else:
            # Handle query parameter for backward compatibility
            story_id = self.request.query_params.get('story_id')
            if story_id:
                queryset = queryset.filter(story_id=story_id)
        
        return queryset.order_by('order', 'created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new checklist item for a project."""
        project_pk = self.kwargs.get('project_pk')
        if project_pk:
            try:
                story = Story.objects.get(id=project_pk)
                data = request.data.copy()
                data['story'] = story.id
                
                # Get the next order number
                max_order = Chapter.objects.filter(story=story).aggregate(
                    max_order=models.Max('order')
                )['max_order'] or 0
                data['order'] = max_order + 1
                
                serializer = self.get_serializer(data=data)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except Story.DoesNotExist:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return super().create(request, *args, **kwargs)
    
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


class AIResponseViewSet(viewsets.ViewSet):
    """
    ViewSet for AI-specific operations and responses.
    """
    
    @action(detail=False, methods=['post'])
    def generate_response(self, request):
        """
        Generate AI response for a given story and message context.
        This endpoint can be used for testing AI responses without saving to database.
        """
        story_id = request.data.get('story_id')
        message_content = request.data.get('message')
        
        if not story_id or not message_content:
            return Response({
                'error': 'story_id and message are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return Response({
                'error': 'Story not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Get conversation history
            conversation_history = []
            messages = Message.objects.filter(story=story).order_by('created_at')
            
            for msg in messages:
                conversation_history.append({
                    'role': msg.role,
                    'content': msg.content
                })
            
            # Generate AI response
            ai_result = ai_service.generate_response(
                story_type=story.type,
                conversation_history=conversation_history,
                user_message=message_content
            )
            
            return Response({
                'story': {
                    'id': story.id,
                    'title': story.title,
                    'type': story.type
                },
                'ai_response': ai_result['response'],
                'suggested_chapters': ai_result.get('suggested_checklist_items', []),
                'success': ai_result['success'],
                'error': ai_result.get('error')
            })
        
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return Response({
                'error': 'Failed to generate AI response',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def validate_configuration(self, request):
        """
        Validate AI service configuration.
        """
        is_valid, message = ai_service.validate_api_configuration()
        
        return Response({
            'valid': is_valid,
            'message': message,
            'model': ai_service.model,
            'base_url': ai_service.base_url,
            'has_api_key': bool(ai_service.api_key)
        })
    
    @action(detail=False, methods=['get'])
    def system_prompts(self, request):
        """
        Get available system prompts for different story types.
        """
        story_types = ['travel', 'wedding']
        prompts = {}
        
        for story_type in story_types:
            prompts[story_type] = ai_service.get_system_prompt(story_type)
        
        return Response({
            'available_types': story_types,
            'prompts': prompts
        })
    
    @action(detail=False, methods=['get'])
    def health_check(self, request):
        """
        Perform AI service health check.
        """
        health_status = ai_service.health_check()
        
        # Determine HTTP status code based on health status
        if health_status['status'] == 'healthy':
            status_code = status.HTTP_200_OK
        elif health_status['status'] == 'degraded':
            status_code = status.HTTP_200_OK  # Still functional
        else:  # unhealthy
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=status_code)