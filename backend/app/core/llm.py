import cohere
from app.core.config import settings

cohere_client = cohere.Client(settings.COHERE_API_KEY)