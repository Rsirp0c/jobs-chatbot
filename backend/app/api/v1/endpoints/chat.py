from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, Message
from app.core.llm import cohere_client as co
from cohere.types import CitationOptions
from typing import List
import json

router = APIRouter()

async def generate_stream(messages: List[Message], context: List[str]):
    print("messages :", messages)  # Debugging, can be removed
    try:
        # Add context to the last message
        if context:
            messages[-1].content += f" Context: {context}"

        print("message_with_context :", messages[-1].content)

        # Transform context into documents
        documents = [{"id": str(idx + 1), "data": doc} for idx, doc in enumerate(context)] if context else []

        print("documents:", documents)  # Debugging, can be removed

        # Call chat_stream with documents
        res = co.chat_stream(
            model="command-r",
            messages=messages,
            documents=documents,
            temperature=0.3,
            citation_options= CitationOptions(mode="ACCURATE")
        )

        # Stream the response
        for event in res:
            if event:
                if event.type == "content-delta":
                    yield f"data: {event.delta.message.content.text}\n\n"
                elif event.type == "citation-start":
                    yield f"data: {event.delta.message.citations}\n\n"
            elif event.event_type == "stream-end":
                yield f"data: [DONE]\n\n"
        
        for cite in res.citations:
            print(cite)

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: [DONE]\n\n"

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    if request.stream:
        return StreamingResponse(
            generate_stream(request.messages, request.context),
            media_type="text/event-stream"
        )
    else:
        try:
            # Transform context into documents
            documents = [{"id": str(idx + 1), "data": doc} for idx, doc in enumerate(request.context.split())] if request.context else []
            
            # Get only the latest message
            current_message = request.messages[-1].content
            
            # Add context to the message if provided
            message_with_context = current_message
            if request.context:
                message_with_context = f"Context: {request.context}\n\nQuestion: {message_with_context}"
            
            response = await co.chat(
                message=message_with_context,
                chat_history=[],  # Empty chat history
                model='command',
                documents=documents  # Add documents parameter
            )
            return {"response": response.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))