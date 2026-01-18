# Generated migration for model changes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0005_update_event_dates'),
    ]

    operations = [
        # Add time field to Event model
        migrations.AddField(
            model_name='event',
            name='time',
            field=models.TimeField(blank=True, null=True),
        ),
        
        # Remove old college field
        migrations.RemoveField(
            model_name='registration',
            name='college',
        ),
        
        # Add new fields to Registration model
        migrations.AddField(
            model_name='registration',
            name='mobile',
            field=models.CharField(default='0000000000', max_length=10),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='registration',
            name='course',
            field=models.CharField(default='Not Specified', max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='registration',
            name='branch',
            field=models.CharField(default='Not Specified', max_length=100),
            preserve_default=False,
        ),
        
        # Update event ForeignKey to add related_name
        migrations.AlterField(
            model_name='registration',
            name='event',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='registrations', to='events.event'),
        ),
        
        # Add unique_together constraint
        migrations.AlterUniqueTogether(
            name='registration',
            unique_together={('event', 'email')},
        ),
        
        # Add Meta ordering
        migrations.AlterModelOptions(
            name='event',
            options={'ordering': ['-date']},
        ),
        migrations.AlterModelOptions(
            name='registration',
            options={'ordering': ['-timestamp']},
        ),
    ]
