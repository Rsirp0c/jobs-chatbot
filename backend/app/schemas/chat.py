from pydantic import BaseModel
from typing import List, Optional, Dict

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: bool = True

class VectorQuery(BaseModel):
    query: str
    filter: Optional[Dict] = None
    top_k: int = 5

class VectorQueryResponse(BaseModel):
    matches: List[Dict]
    metadata: Optional[Dict] = None
