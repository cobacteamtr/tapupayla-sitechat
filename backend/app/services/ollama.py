"""
Unified LLM Service using the provider factory (Groq, Ollama, etc.).
"""
from typing import AsyncGenerator, Optional, List, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from loguru import logger

from app.config import settings
from app.providers.factory import get_llm


class LLMService:
    """Unified service for interacting with the configured LLM provider."""
    
    def __init__(self):
        # Initialize the LLM via the factory
        self.llm = get_llm()

    async def generate(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate a response from the LLM.
        """
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content if hasattr(response, "content") else str(response)

        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            raise
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """
        Stream a response from the LLM.
        """
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        
        try:
            async for chunk in self.llm.astream(messages):
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                if content:
                    yield content

        except Exception as e:
            logger.error(f"LLM streaming error: {e}")
            raise
    
    async def check_health(self) -> bool:
        """Check if LLM is responsive."""
        try:
            res = await self.generate("Ping", max_tokens=5)
            return bool(res)
        except Exception:
            return False
    
    async def list_models(self) -> list:
        """Return configured model."""
        return [settings.LLM_MODEL]


# Singleton instance alias to maintain compatibility with existing RAGEngine references
_llm_service: Optional[LLMService] = None

def get_ollama_service() -> LLMService:
    """Get or create unified LLM service instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

# Alias for backward compatibility
OllamaService = LLMService
