from rest_framework import serializers
from .models import Story, Message, Chapter


class ChapterSerializer(serializers.ModelSerializer):
    """
    Serializer for Chapter model with validation.
    """
    class Meta:
        model = Chapter
        fields = ['id', 'story', 'title', 'description', 'completed', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        """Validate that title is not empty and within length limits."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        if len(value.strip()) > 200:
            raise serializers.ValidationError("Title cannot exceed 200 characters.")
        return value.strip()
    
    def validate_description(self, value):
        """Validate description length if provided."""
        if value and len(value.strip()) > 1000:
            raise serializers.ValidationError("Description cannot exceed 1000 characters.")
        return value.strip() if value else ""


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Message model with role validation.
    """
    class Meta:
        model = Message
        fields = ['id', 'story', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_content(self, value):
        """Validate that message content is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()
    
    def validate_role(self, value):
        """Validate that role is one of the allowed choices."""
        if value not in ['user', 'assistant']:
            raise serializers.ValidationError("Role must be either 'user' or 'assistant'.")
        return value


class StorySerializer(serializers.ModelSerializer):
    """
    Serializer for Story model with nested relationships.
    """
    messages = MessageSerializer(many=True, read_only=True, source='message_set')
    chapters = ChapterSerializer(many=True, read_only=True, source='chapter_set')
    message_count = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()
    completed_chapters_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Story
        fields = [
            'id', 'title', 'type', 'progress', 'created_at', 'updated_at',
            'messages', 'chapters', 'message_count', 'chapter_count',
            'completed_chapters_count'
        ]
        read_only_fields = ['id', 'progress', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        """Validate that title is not empty and within length limits."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        if len(value.strip()) > 200:
            raise serializers.ValidationError("Title cannot exceed 200 characters.")
        return value.strip()
    
    def validate_type(self, value):
        """Validate that story type is one of the allowed choices."""
        allowed_types = [choice[0] for choice in Story.STORY_TYPES]
        if value not in allowed_types:
            raise serializers.ValidationError(
                f"Story type must be one of: {', '.join(allowed_types)}"
            )
        return value
    
    def get_message_count(self, obj):
        """Return the total number of messages in the story."""
        return obj.message_set.count()
    
    def get_chapter_count(self, obj):
        """Return the total number of chapters in the story."""
        return obj.chapter_set.count()
    
    def get_completed_chapters_count(self, obj):
        """Return the number of completed chapters."""
        return obj.chapter_set.filter(completed=True).count()


class StoryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for story list views without nested data.
    """
    message_count = serializers.SerializerMethodField()
    chapter_count = serializers.SerializerMethodField()
    completed_chapters_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Story
        fields = [
            'id', 'title', 'type', 'progress', 'created_at', 'updated_at',
            'message_count', 'chapter_count', 'completed_chapters_count'
        ]
        read_only_fields = ['id', 'progress', 'created_at', 'updated_at']
    
    def get_message_count(self, obj):
        """Return the total number of messages in the story."""
        return obj.message_set.count()
    
    def get_chapter_count(self, obj):
        """Return the total number of chapters in the story."""
        return obj.chapter_set.count()
    
    def get_completed_chapters_count(self, obj):
        """Return the number of completed chapters."""
        return obj.chapter_set.filter(completed=True).count()


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for creating messages with minimal fields.
    """
    class Meta:
        model = Message
        fields = ['story', 'content']
    
    def validate_content(self, value):
        """Validate that message content is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()
    
    def create(self, validated_data):
        """Create a user message (role is automatically set to 'user')."""
        validated_data['role'] = 'user'
        return super().create(validated_data)