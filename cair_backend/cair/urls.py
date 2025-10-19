from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Router will be configured in later tasks
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
]