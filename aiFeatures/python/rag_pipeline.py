import os
import faiss
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from pypdf import PdfReader
from typing import List, Dict, Tuple, Union, Optional
import logging

# Using FAISS vector store
HYBRID_STORE_AVAILABLE = False

# Set up logging
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: str) -> List[Tuple[str, Dict]]:
    """
    Extracts text from a given PDF file with metadata.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of tuples containing (text, metadata)
    """
    logger.info(f"Extracting text from {os.path.basename(pdf_path)}")
    
    try:
        reader = PdfReader(pdf_path)
        texts_with_metadata = []
        
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():  # Check if text is not empty or just whitespace
                metadata = {
                    "file_name": os.path.basename(pdf_path),
                    "file_path": pdf_path,
                    "page_index": page_idx,
                    "total_pages": len(reader.pages)
                }
                texts_with_metadata.append((text, metadata))
        
        logger.info(f"Extracted {len(texts_with_metadata)} pages with text from {os.path.basename(pdf_path)}")
        return texts_with_metadata
        
    except Exception as e:
        logger.error(f"Error extracting text from {pdf_path}: {str(e)}")
        return []

def index_pdfs(pdf_inputs: Union[str, List[str]], chunk_size: int = 1000, chunk_overlap: int = 200, 
               model: str = "mxbai-embed-large:latest") -> Optional[FAISS]:
    """
    Unified function to index PDFs with hybrid storage (local FAISS vs Pinecone)
    
    Args:
        pdf_inputs: Can be a single PDF path, a list of PDF paths, or a folder path
        chunk_size: Size of text chunks for splitting
        chunk_overlap: Overlap between chunks
        model: Embedding model to use
        
    Returns:
        Vector store (FAISS for legacy compatibility, or hybrid store)
    """
    all_texts_with_metadata = []
    
    # Process different input types
    if isinstance(pdf_inputs, str):
        if os.path.isdir(pdf_inputs):
            # It's a folder path
            logger.info(f"Indexing all PDFs in folder: {pdf_inputs}")
            pdf_files = [os.path.join(pdf_inputs, f) for f in os.listdir(pdf_inputs) 
                         if f.lower().endswith(".pdf")]
            
            if not pdf_files:
                logger.warning(f"No PDF files found in folder: {pdf_inputs}")
                return None
                
            for pdf in pdf_files:
                all_texts_with_metadata.extend(extract_text_from_pdf(pdf))
        
        elif os.path.isfile(pdf_inputs) and pdf_inputs.lower().endswith(".pdf"):
            # It's a single PDF file
            logger.info(f"Indexing single PDF: {pdf_inputs}")
            all_texts_with_metadata = extract_text_from_pdf(pdf_inputs)
        
        else:
            logger.error(f"Invalid input: {pdf_inputs} is not a PDF file or folder")
            return None
    
    elif isinstance(pdf_inputs, list):
        # It's a list of PDF paths
        logger.info(f"Indexing {len(pdf_inputs)} PDF files")
        for pdf in pdf_inputs:
            if os.path.isfile(pdf) and pdf.lower().endswith(".pdf"):
                all_texts_with_metadata.extend(extract_text_from_pdf(pdf))
            else:
                logger.warning(f"Skipping invalid file: {pdf}")
    
    else:
        logger.error("Invalid input type. Expected a string path or list of paths")
        return None
    
    # Check if we have any texts to index
    if not all_texts_with_metadata:
        logger.warning("No text content extracted from any PDFs")
        return None
    
    # Use hybrid storage if available, otherwise fall back to legacy FAISS
    if HYBRID_STORE_AVAILABLE:
        logger.info(f"Creating hybrid vector store with {len(all_texts_with_metadata)} text segments")
        return create_hybrid_index(all_texts_with_metadata, chunk_size, chunk_overlap, model)
    else:
        logger.info(f"Creating legacy FAISS index with {len(all_texts_with_metadata)} text segments")
        return create_faiss_index(all_texts_with_metadata, chunk_size, chunk_overlap, model)

def create_hybrid_index(texts_with_metadata: List[Tuple[str, Dict]], 
                       chunk_size: int = 1000, 
                       chunk_overlap: int = 200,
                       model: str = "mxbai-embed-large:latest") -> Optional[FAISS]:
    """
    Creates a FAISS index (hybrid functionality removed).
    
    Args:
        texts_with_metadata: List of tuples containing (text, metadata)
        chunk_size: Size of text chunks for splitting
        chunk_overlap: Overlap between chunks
        model: Embedding model to use
        
    Returns:
        FAISS vector store or None if creation failed
    """
    # Since hybrid functionality was removed, just use FAISS
    return create_faiss_index(texts_with_metadata, chunk_size, chunk_overlap, model)

def create_faiss_index(texts_with_metadata: List[Tuple[str, Dict]], 
                      chunk_size: int = 1000, 
                      chunk_overlap: int = 200,
                      model: str = "mxbai-embed-large:latest") -> FAISS:
    """
    Creates a FAISS index from extracted text using embeddings and stores metadata.
    
    Args:
        texts_with_metadata: List of tuples containing (text, metadata)
        chunk_size: Size of text chunks for splitting
        chunk_overlap: Overlap between chunks
        model: Embedding model to use
        
    Returns:
        FAISS vector store
    """
    # Initialize text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, 
        chunk_overlap=chunk_overlap
    )
    
    # Process text chunks with metadata
    documents = []
    metadata_list = []
    
    for text, metadata in texts_with_metadata:
        chunks = text_splitter.split_text(text)
        documents.extend(chunks)
        metadata_list.extend([metadata] * len(chunks))
    
    logger.info(f"Created {len(documents)} text chunks after splitting")
    
    # Initialize embedding model
    try:
        embeddings = OllamaEmbeddings(model=model)
        # Test the embedding function
        embedding_dim = len(embeddings.embed_query("test"))
        logger.info(f"Using embedding model {model} with dimension {embedding_dim}")
    except Exception as e:
        logger.error(f"Error initializing embedding model: {str(e)}")
        raise
    
    # Create FAISS index
    index = faiss.IndexFlatL2(embedding_dim)
    vector_store = FAISS(
        embedding_function=embeddings,
        index=index,
        docstore=InMemoryDocstore(),
        index_to_docstore_id={},
    )
    
    # Add documents to vector store
    vector_store.add_texts(documents, metadatas=metadata_list)
    logger.info(f"Successfully indexed {len(documents)} text chunks")
    
    return vector_store

def retrieve_answer(query: str, vector_store, k: int = 3) -> str:
    """
    Retrieves the most relevant documents based on the query, with metadata.
    Works with both FAISS and hybrid vector stores.
    
    Args:
        query: The search query
        vector_store: Vector store to search in (FAISS or hybrid)
        k: Number of results to return
        
    Returns:
        Formatted string with search results
    """
    if not vector_store:
        return "No vector store available."
    
    logger.info(f"Searching for: '{query}'")
    
    try:
        # Handle both FAISS and hybrid vector stores
        if hasattr(vector_store, 'similarity_search_with_score'):
            docs = vector_store.similarity_search_with_score(query, k=k)
        else:
            logger.error("Vector store does not support similarity search")
            return "Search not supported for this vector store type."
        
        if not docs:
            return "No relevant information found."
        
        results = []
        for i, (doc, score) in enumerate(docs):
            metadata = doc.metadata if hasattr(doc, 'metadata') else {}
            content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
            
            # Handle different metadata formats
            file_name = metadata.get('file_name', 'Unknown')
            page_num = metadata.get('page_index', 0) + 1 if 'page_index' in metadata else 'Unknown'
            total_pages = metadata.get('total_pages', 'Unknown')
            
            results.append(
                f"Result {i+1} (Similarity: {1 - score:.4f}):\n"
                f"File: {file_name}, Page: {page_num}/{total_pages}\n"
                f"Content: {content.strip()}\n"
            )
        
        return "\n".join(results)
        
    except Exception as e:
        logger.error(f"Error during retrieval: {str(e)}")
        return f"Error retrieving information: {str(e)}"
