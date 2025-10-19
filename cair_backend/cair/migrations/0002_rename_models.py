# Generated migration to rename models from Project/ChecklistItem to Story/Chapter

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cair', '0001_initial'),
    ]

    operations = [
        # Rename ConciergeProject to Story
        migrations.RenameModel(
            old_name='ConciergeProject',
            new_name='Story',
        ),
        
        # Update the choices for the type field
        migrations.AlterField(
            model_name='story',
            name='type',
            field=models.CharField(
                choices=[('travel', 'Travel Story'), ('wedding', 'Wedding Story')], 
                max_length=50
            ),
        ),
        
        # Rename ChecklistItem to Chapter and update fields
        migrations.RenameModel(
            old_name='ChecklistItem',
            new_name='Chapter',
        ),
        
        # Rename the foreign key field from project to story in Message
        migrations.RenameField(
            model_name='message',
            old_name='project',
            new_name='story',
        ),
        
        # Rename the foreign key field from project to story in Chapter
        migrations.RenameField(
            model_name='chapter',
            old_name='project',
            new_name='story',
        ),
        
        # Add new fields to Chapter model
        migrations.AddField(
            model_name='chapter',
            name='title',
            field=models.CharField(default='Untitled Chapter', max_length=200),
            preserve_default=False,
        ),
        
        migrations.AddField(
            model_name='chapter',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
        
        # Rename description field and make it a TextField
        migrations.RenameField(
            model_name='chapter',
            old_name='description',
            new_name='description_temp',
        ),
        
        migrations.AddField(
            model_name='chapter',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        
        # Copy data from old description field to new one and remove old field
        migrations.RunSQL(
            "UPDATE cair_chapter SET description = description_temp",
            reverse_sql="UPDATE cair_chapter SET description_temp = description",
        ),
        
        migrations.RemoveField(
            model_name='chapter',
            name='description_temp',
        ),
    ]