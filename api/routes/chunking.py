"""
Semantic Chunking API

Implements RAG.md Phase 2 guidance:
- Split documents by semantic boundaries (not fixed-size)
- Use cosine similarity between sentence embeddings
- Preserve hierarchical structure for SOP/process docs
- Create sub-atoms with parent references
"""

import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

try:
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity

    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False


# Data Models
class ChunkRequest(BaseModel):
    """Request to chunk a document."""

    document_text: str
    parent_atom_id: Optional[str] = None
    chunk_strategy: str = "semantic"  # semantic, paragraph, fixed_size
    similarity_threshold: float = 0.8  # For semantic chunking
    max_chunk_size: int = 500  # Max tokens per chunk
    preserve_structure: bool = True  # Preserve headers/sections


class Chunk(BaseModel):
    """A semantic chunk of a document."""

    chunk_id: str
    text: str
    start_char: int
    end_char: int
    parent_atom_id: Optional[str]
    section_header: Optional[str]
    chunk_index: int
    semantic_score: Optional[float]  # Similarity to previous chunk
    embedding_preview: Optional[List[float]] = None  # First 5 dims


class ChunkResponse(BaseModel):
    """Response containing chunks."""

    chunks: List[Chunk]
    total_chunks: int
    strategy_used: str
    original_length: int
    avg_chunk_length: int


# Semantic Chunking Implementation
class SemanticChunker:
    """
    Chunks documents by semantic boundaries using embeddings.

    Following RAG.md guidance:
    - Don't use fixed-size chunks (breaks sentences, loses context)
    - Split by semantic boundaries (sections, paragraphs)
    - Measure cosine similarity between consecutive sentence embeddings
    - Create chunk boundaries where semantic shift exceeds threshold
    """

    def __init__(self, similarity_threshold: float = 0.8):
        """Initialize semantic chunker."""
        self.similarity_threshold = similarity_threshold

        # Load embedding model (lightweight for fast chunking)
        if HAS_TRANSFORMERS:
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
        else:
            self.model = None

    def split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences (simple heuristic)."""
        # Split on period, exclamation, question mark followed by space/newline
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if s.strip()]

    def extract_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract hierarchical sections from document.

        Preserves structure for SOP/process documentation:
        - Detects headers (# Header, ## Subheader, numbered sections)
        - Groups content under headers
        - Maintains parent-child relationships
        """
        sections = []
        current_section = {"header": None, "content": [], "level": 0}

        lines = text.split("\n")
        for line in lines:
            # Detect markdown headers
            header_match = re.match(r"^(#{1,6})\s+(.+)$", line)
            if header_match:
                # Save previous section
                if current_section["content"]:
                    sections.append(current_section.copy())

                # Start new section
                level = len(header_match.group(1))
                current_section = {"header": header_match.group(2).strip(), "content": [], "level": level}

            # Detect numbered sections (1. Section, 1.1 Subsection)
            elif re.match(r"^\d+(\.\d+)*\s+\w+", line):
                if current_section["content"]:
                    sections.append(current_section.copy())

                current_section = {"header": line.strip(), "content": [], "level": line.count(".") + 1}

            else:
                # Add content to current section
                if line.strip():
                    current_section["content"].append(line)

        # Add final section
        if current_section["content"]:
            sections.append(current_section)

        return sections

    def chunk_by_semantic_similarity(self, sentences: List[str], embeddings: np.ndarray) -> List[List[str]]:
        """
        Group sentences into chunks based on semantic similarity.

        Algorithm:
        1. Compute cosine similarity between consecutive sentence embeddings
        2. When similarity drops below threshold, create chunk boundary
        3. Result: coherent chunks that preserve meaning
        """
        if len(sentences) <= 1:
            return [sentences]

        chunks = []
        current_chunk = [sentences[0]]

        for i in range(1, len(sentences)):
            # Calculate similarity between current and previous sentence
            prev_embedding = embeddings[i - 1].reshape(1, -1)
            curr_embedding = embeddings[i].reshape(1, -1)
            similarity = cosine_similarity(prev_embedding, curr_embedding)[0][0]

            # If similarity drops below threshold, start new chunk
            if similarity < self.similarity_threshold:
                chunks.append(current_chunk)
                current_chunk = [sentences[i]]
            else:
                current_chunk.append(sentences[i])

        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def chunk(self, text: str, parent_atom_id: Optional[str] = None, preserve_structure: bool = True) -> List[Chunk]:
        """
        Chunk document using semantic boundaries.

        Args:
            text: Document text to chunk
            parent_atom_id: Parent atom ID for reference
            preserve_structure: Preserve headers/sections

        Returns:
            List of semantic chunks
        """
        if not self.model:
            raise RuntimeError("Sentence transformers not installed")

        chunks = []

        if preserve_structure:
            # Extract sections first
            sections = self.extract_sections(text)

            for section in sections:
                section_text = "\n".join(section["content"])
                if not section_text.strip():
                    continue

                # Split section into sentences
                sentences = self.split_into_sentences(section_text)
                if not sentences:
                    continue

                # Generate embeddings
                embeddings = self.model.encode(sentences)

                # Chunk by semantic similarity
                sentence_chunks = self.chunk_by_semantic_similarity(sentences, embeddings)

                # Create Chunk objects
                char_offset = 0
                for i, sentence_group in enumerate(sentence_chunks):
                    chunk_text = " ".join(sentence_group)

                    chunk = Chunk(
                        chunk_id=f"{parent_atom_id}-chunk-{len(chunks)}" if parent_atom_id else f"chunk-{len(chunks)}",
                        text=chunk_text,
                        start_char=char_offset,
                        end_char=char_offset + len(chunk_text),
                        parent_atom_id=parent_atom_id,
                        section_header=section["header"],
                        chunk_index=len(chunks),
                        semantic_score=None,  # Would calculate from embeddings
                    )
                    chunks.append(chunk)
                    char_offset += len(chunk_text) + 1

        else:
            # Simple sentence-based chunking without structure preservation
            sentences = self.split_into_sentences(text)
            embeddings = self.model.encode(sentences)
            sentence_chunks = self.chunk_by_semantic_similarity(sentences, embeddings)

            char_offset = 0
            for i, sentence_group in enumerate(sentence_chunks):
                chunk_text = " ".join(sentence_group)

                chunk = Chunk(
                    chunk_id=f"{parent_atom_id}-chunk-{i}" if parent_atom_id else f"chunk-{i}",
                    text=chunk_text,
                    start_char=char_offset,
                    end_char=char_offset + len(chunk_text),
                    parent_atom_id=parent_atom_id,
                    section_header=None,
                    chunk_index=i,
                    semantic_score=None,
                )
                chunks.append(chunk)
                char_offset += len(chunk_text) + 1

        return chunks


# Fallback Chunking Strategies
def chunk_by_paragraphs(text: str, parent_atom_id: Optional[str] = None) -> List[Chunk]:
    """Simple paragraph-based chunking (fallback if no transformers)."""
    paragraphs = text.split("\n\n")
    chunks = []

    char_offset = 0
    for i, para in enumerate(paragraphs):
        if not para.strip():
            continue

        chunk = Chunk(
            chunk_id=f"{parent_atom_id}-chunk-{i}" if parent_atom_id else f"chunk-{i}",
            text=para.strip(),
            start_char=char_offset,
            end_char=char_offset + len(para),
            parent_atom_id=parent_atom_id,
            section_header=None,
            chunk_index=i,
            semantic_score=None,
        )
        chunks.append(chunk)
        char_offset += len(para) + 2  # +2 for \n\n

    return chunks


def chunk_by_fixed_size(text: str, max_size: int = 500, parent_atom_id: Optional[str] = None) -> List[Chunk]:
    """Fixed-size chunking (not recommended per RAG.md, but available)."""
    chunks = []
    words = text.split()

    current_chunk = []
    char_offset = 0

    for i, word in enumerate(words):
        current_chunk.append(word)

        # Check if chunk is large enough
        if len(" ".join(current_chunk)) >= max_size:
            chunk_text = " ".join(current_chunk)

            chunk = Chunk(
                chunk_id=f"{parent_atom_id}-chunk-{len(chunks)}" if parent_atom_id else f"chunk-{len(chunks)}",
                text=chunk_text,
                start_char=char_offset,
                end_char=char_offset + len(chunk_text),
                parent_atom_id=parent_atom_id,
                section_header=None,
                chunk_index=len(chunks),
                semantic_score=None,
            )
            chunks.append(chunk)

            char_offset += len(chunk_text) + 1
            current_chunk = []

    # Add remaining words
    if current_chunk:
        chunk_text = " ".join(current_chunk)
        chunk = Chunk(
            chunk_id=f"{parent_atom_id}-chunk-{len(chunks)}" if parent_atom_id else f"chunk-{len(chunks)}",
            text=chunk_text,
            start_char=char_offset,
            end_char=char_offset + len(chunk_text),
            parent_atom_id=parent_atom_id,
            section_header=None,
            chunk_index=len(chunks),
            semantic_score=None,
        )
        chunks.append(chunk)

    return chunks


# API Endpoints
@router.post("/api/chunking/chunk", response_model=ChunkResponse)
async def chunk_document(request: ChunkRequest):
    """
    Chunk a document using the specified strategy.

    Strategies:
    - semantic: RAG.md recommended - split by semantic boundaries
    - paragraph: Simple paragraph splitting
    - fixed_size: Fixed token/character size (not recommended)
    """
    if not request.document_text.strip():
        raise HTTPException(status_code=400, detail="Document text is empty")

    # Route to appropriate chunking strategy
    if request.chunk_strategy == "semantic":
        if not HAS_TRANSFORMERS:
            raise HTTPException(
                status_code=500,
                detail="Semantic chunking requires sentence-transformers: pip install sentence-transformers",
            )

        chunker = SemanticChunker(similarity_threshold=request.similarity_threshold)
        chunks = chunker.chunk(
            text=request.document_text,
            parent_atom_id=request.parent_atom_id,
            preserve_structure=request.preserve_structure,
        )

    elif request.chunk_strategy == "paragraph":
        chunks = chunk_by_paragraphs(text=request.document_text, parent_atom_id=request.parent_atom_id)

    elif request.chunk_strategy == "fixed_size":
        chunks = chunk_by_fixed_size(
            text=request.document_text, max_size=request.max_chunk_size, parent_atom_id=request.parent_atom_id
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown chunking strategy: {request.chunk_strategy}")

    # Calculate statistics
    avg_length = sum(len(c.text) for c in chunks) // len(chunks) if chunks else 0

    return ChunkResponse(
        chunks=chunks,
        total_chunks=len(chunks),
        strategy_used=request.chunk_strategy,
        original_length=len(request.document_text),
        avg_chunk_length=avg_length,
    )


@router.get("/api/chunking/health")
def chunking_health():
    """Check chunking system health."""
    return {
        "transformers_installed": HAS_TRANSFORMERS,
        "openai_installed": HAS_OPENAI,
        "semantic_chunking_available": HAS_TRANSFORMERS,
        "strategies_available": (
            ["semantic", "paragraph", "fixed_size"] if HAS_TRANSFORMERS else ["paragraph", "fixed_size"]
        ),
    }
