from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Story(models.Model):
    """
    Represents a story with specialized AI assistance.
    """
    STORY_TYPES = [
        ('travel', 'Travel Story'),
        ('wedding', 'Wedding Story'),
    ]
    
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=50, choices=STORY_TYPES)
    progress = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"
    
    def calculate_progress(self):
        """Calculate progress based on completed chapters."""
        total_chapters = self.chapter_set.count()
        if total_chapters == 0:
            return 0.0
        completed_chapters = self.chapter_set.filter(completed=True).count()
        return completed_chapters / total_chapters
    
    def update_progress(self):
        """Update and save the progress field."""
        self.progress = self.calculate_progress()
        self.save(update_fields=['progress', 'updated_at'])


class Message(models.Model):
    """
    Represents a message in the conversation between user and AI agent.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    id = models.AutoField(primary_key=True)
    story = models.ForeignKey(Story, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.get_role_display()}: {self.content[:50]}..."


class Chapter(models.Model):
    """
    Represents a chapter or step in a story.
    """
    id = models.AutoField(primary_key=True)
    story = models.ForeignKey(Story, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        status = "✓" if self.completed else "○"
        return f"{status} {self.title}"
    
    def save(self, *args, **kwargs):
        """Override save to update story progress when chapter changes."""
        super().save(*args, **kwargs)
        # Update story progress after saving chapter
        self.story.update_progress()