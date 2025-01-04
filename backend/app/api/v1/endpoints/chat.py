from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, Message
from app.core.llm import cohere_client as co
from typing import List
import json

router = APIRouter()

async def generate_stream(messages: List[Message], context: str = ""):
    print("message :", messages)
    try:
        current_message = messages[-1].content
        message_with_context = current_message
        if context:
            message_with_context = f"Context: {context}\n\n Question: {message_with_context}"

        print("message_with_context :", message_with_context)

        res = co.chat_stream(
            model="command-r",
            message=message_with_context,
            chat_history=[], 
        )
        
        # Stream the response
        for event in res:
            if event.event_type == 'text-generation':
                yield f"data: {json.dumps({'response': event.text})}\n\n"
            elif event.event_type == 'stream-end':
                yield f"data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: [DONE]\n\n"

@router.post("/stream")
async def chat_stream(request: ChatRequest, context: str = ""):
    if request.stream:
        return StreamingResponse(
            generate_stream(request.messages, context),
            media_type="text/event-stream"
        )
    else:
        try:
            # Get only the latest message
            current_message = request.messages[-1].content
            
            # Add context to the message if provided
            message_with_context = current_message
            if context:
                message_with_context = f"Context: {context}\n\nQuestion: {message_with_context}"
            
            response = await co.chat(
                message=message_with_context,
                chat_history=[],  # Empty chat history
                model='command'
            )
            return {"response": response.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))