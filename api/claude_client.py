"""Claude API client for generating natural language RAG answers.

Integrates with the RAG system to provide context-grounded responses.
"""
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from anthropic import Anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


class ClaudeClient:
    """Claude API client for RAG answer generation."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Claude client with API key."""
        if not HAS_ANTHROPIC:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")
        
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        
        self.client = Anthropic(api_key=self.api_key)
        self.model = "claude-sonnet-4-20250514"  # Latest Claude Sonnet
    
    def generate_rag_answer(
        self,
        query: str,
        context_atoms: List[Dict[str, Any]],
        rag_mode: str = "entity",
        max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """Generate natural language answer from RAG context.
        
        Args:
            query: User's question
            context_atoms: Retrieved atoms with content and metadata
            rag_mode: RAG mode used (entity, path, impact)
            max_tokens: Maximum tokens in response
            
        Returns:
            Dict with answer, sources, and metadata
        """
        # Build context from atoms
        context_text = self._build_context(context_atoms, rag_mode)
        
        # Build prompt based on RAG mode
        system_prompt = self._get_system_prompt(rag_mode)
        user_prompt = self._build_user_prompt(query, context_text, rag_mode)
        
        # Call Claude API
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            answer = message.content[0].text
            
            return {
                "answer": answer,
                "model": self.model,
                "tokens_used": {
                    "input": message.usage.input_tokens,
                    "output": message.usage.output_tokens,
                    "total": message.usage.input_tokens + message.usage.output_tokens
                },
                "sources": [
                    {
                        "id": atom.get("id", ""),
                        "type": atom.get("type", "unknown"),
                        "title": atom.get("title", ""),
                        "relevance_score": atom.get("distance", 0.0)
                    }
                    for atom in context_atoms[:10]  # Top 10 sources
                    if atom and isinstance(atom, dict)
                ]
            }
        except Exception as e:
            return {
                "answer": f"Error generating answer: {str(e)}",
                "error": str(e),
                "sources": []
            }
    
    def _build_context(self, atoms: List[Dict[str, Any]], rag_mode: str) -> str:
        """Build context string from retrieved atoms."""
        if not atoms:
            return "No relevant information found."
        
        context_parts = []

        for i, atom in enumerate(atoms[:10], 1):  # Limit to top 10
            # Skip None or invalid atoms
            if not atom or not isinstance(atom, dict):
                continue

            atom_id = atom.get("id", "unknown")
            atom_type = atom.get("type", "unknown")
            title = atom.get("title", "")
            content = atom.get("content", atom.get("summary", ""))
            
            # For path/impact RAG, include relationship info
            relationship = ""
            if rag_mode == "path" and "relationship" in atom:
                relationship = f" (via {atom['relationship']})"
            elif rag_mode == "impact" and "relationship_path" in atom:
                path = " → ".join(atom["relationship_path"])
                relationship = f" (impact path: {path})"
            
            context_parts.append(
                f"[{i}] {atom_type.upper()} {atom_id}: {title}{relationship}\n{content}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    def _get_system_prompt(self, rag_mode: str) -> str:
        """Get system prompt based on RAG mode."""
        base_prompt = """You are a knowledgeable assistant for the Graph-Native Documentation Platform (GNDP). 
Your role is to provide accurate, helpful answers based on the provided documentation atoms.

CRITICAL RULES:
1. ONLY use information from the provided context atoms
2. If the context doesn't contain the answer, say so clearly
3. Always cite sources using [atom_id] notation
4. Be concise but comprehensive
5. Maintain technical accuracy"""
        
        mode_specific = {
            "entity": """

ENTITY RAG MODE:
- You have semantically similar atoms based on vector search
- Focus on direct relevance to the query
- Synthesize information from multiple related atoms""",
            
            "path": """

PATH RAG MODE:
- You have atoms connected through relationships in the knowledge graph
- Pay attention to relationship paths (e.g., "implements", "requires", "validates")
- Explain how atoms are connected and why that matters
- Provide context about the broader system structure""",
            
            "impact": """

IMPACT RAG MODE:
- You have atoms showing downstream dependencies and impacts
- Focus on what would be affected by changes
- Explain the impact chain and risk levels
- Highlight critical dependencies"""
        }
        
        return base_prompt + mode_specific.get(rag_mode, "")
    
    def _build_user_prompt(self, query: str, context: str, rag_mode: str) -> str:
        """Build user prompt with query and context."""
        return f"""QUESTION: {query}

CONTEXT FROM KNOWLEDGE GRAPH:
{context}

Please answer the question based on the provided context. Remember to:
- Cite sources using [atom_id]
- Only use information from the context
- Be accurate and concise
- Explain relationships if relevant (especially for path/impact modes)"""


# Global client instance
_claude_client: Optional[ClaudeClient] = None


def get_claude_client() -> Optional[ClaudeClient]:
    """Get or create the global Claude client instance."""
    global _claude_client
    
    if not HAS_ANTHROPIC:
        return None
    
    if _claude_client is None:
        try:
            _claude_client = ClaudeClient()
        except Exception as e:
            print(f"Failed to initialize Claude client: {e}")
            return None
    
    return _claude_client
