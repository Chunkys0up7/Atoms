import os
import logging
from typing import Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Client for interacting with Google's Gemini models via the new google-genai SDK.
    """
    
    _instance: Optional["GeminiClient"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeminiClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "client"):
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY/GOOGLE_API_KEY not found in environment")
                self.client = None
            else:
                self.client = genai.Client(api_key=api_key)
                logger.info("GeminiClient initialized successfully")

    def generate_content(
        self, 
        prompt: str, 
        model: str = "gemini-1.5-flash-001", 
        config: Optional[types.GenerateContentConfig] = None
    ) -> str:
        """
        Generate content using the Gemini model.
        
        Args:
            prompt: The text prompt.
            model: Model name (default: gemini-2.0-flash-exp).
            config: Optional generation config.
            
        Returns:
            The generated text response.
        """
        if not self.client:
            raise ValueError("GeminiClient not initialized with API key")

        try:
            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            return response.text
        except Exception as e:
            logger.error(f"Error generating content with Gemini: {e}")
            raise

def get_gemini_client() -> GeminiClient:
    return GeminiClient()
