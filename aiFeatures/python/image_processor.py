"""
Image Processing Module for studybuddy  
Handles image analysis using Gemini AI model for comprehensive understanding
"""

import cv2
import numpy as np
import tempfile
import os
import base64
from PIL import Image
import io
import json
from typing import List, Dict, Any, Optional
import logging
import google.generativeai as genai
from dotenv import load_dotenv

# Set up logging
logger = logging.getLogger(__name__)

class ImageProcessor:
    """Handles image processing and AI-powered analysis using Gemini."""
    
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit
        self.max_dimension = 2048  # Maximum width or height
        self._model = None
        self._init_gemini_model()
    
    def process_image(self, image_file) -> Dict[str, Any]:
        """
        Process uploaded image using Gemini AI for comprehensive analysis.
        
        Args:
            image_file: Flask file object containing the image
            
        Returns:
            Dict containing AI analysis results and metadata
        """
        tmp_file_path = None
        try:
            # Validate file format
            if not self._is_valid_image_format(image_file.filename):
                return {
                    "success": False,
                    "error": f"Unsupported image format. Supported formats: {', '.join(self.supported_formats)}"
                }
            
            # Check file size
            image_file.seek(0, 2)  # Seek to end
            file_size = image_file.tell()
            image_file.seek(0)  # Reset to beginning
            
            if file_size > self.max_file_size:
                return {
                    "success": False,
                    "error": f"Image file too large. Maximum size is {self.max_file_size // (1024*1024)}MB."
                }
            
            # Save image temporarily
            import uuid
            temp_dir = tempfile.gettempdir()
            unique_name = f"studybuddy_image_{uuid.uuid4().hex}{self._get_file_extension(image_file.filename)}"
            tmp_file_path = os.path.join(temp_dir, unique_name)
            
            # Save the file
            image_file.save(tmp_file_path)
            
            # Load image for basic metadata
            image = self._load_image(tmp_file_path)
            if image is None:
                return {
                    "success": False,
                    "error": "Could not load image file"
                }
            
            # Extract basic metadata
            metadata = self._extract_image_metadata(tmp_file_path, image)
            
            # Use Gemini AI for comprehensive image analysis
            ai_analysis = self._analyze_with_gemini(tmp_file_path)
            
            # Generate base64 encoded image for display
            image_base64 = self._encode_image_to_base64(image)
            
            # Derive an accessibility-friendly alt text from AI analysis
            alt_text = None
            try:
                if isinstance(ai_analysis, dict):
                    overall = ai_analysis.get('overall_description') or ''
                    subjects = ai_analysis.get('main_subjects') or []
                    scene = ai_analysis.get('scene_type') or ''
                    notable = ai_analysis.get('notable_details') or []
                    parts = []
                    if overall:
                        parts.append(overall)
                    if subjects:
                        parts.append(f"Subjects: {', '.join(subjects)}")
                    if scene:
                        parts.append(f"Scene: {scene}")
                    if notable:
                        parts.append(f"Details: {', '.join(notable[:3])}")
                    alt_text = ". ".join(p for p in parts if p).strip() or None
            except Exception:
                alt_text = None
            
            return {
                "success": True,
                "metadata": self._make_json_serializable(metadata),
                "ai_analysis": ai_analysis,
                "image_base64": image_base64,
                "suggested_questions": self._generate_suggested_questions_from_ai(ai_analysis),
                "alt_text": alt_text
            }
                
        except Exception as e:
            logger.error(f"Image processing failed: {str(e)}")
            return {
                "success": False,
                "error": f"Image processing failed: {str(e)}"
            }
        finally:
            # Clean up temporary file
            if tmp_file_path and os.path.exists(tmp_file_path):
                try:
                    os.unlink(tmp_file_path)
                    logger.info(f"Cleaned up temporary file: {tmp_file_path}")
                except Exception as e:
                    logger.warning(f"Could not delete temporary file {tmp_file_path}: {e}")
    
    def _is_valid_image_format(self, filename: str) -> bool:
        """Check if the file format is supported."""
        if not filename:
            return False
        ext = os.path.splitext(filename.lower())[1]
        return ext in self.supported_formats
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename."""
        return os.path.splitext(filename)[1]
    
    def _load_image(self, image_path: str) -> Optional[np.ndarray]:
        """Load image using OpenCV."""
        try:
            image = cv2.imread(image_path)
            if image is None:
                # Try with PIL as fallback
                pil_image = Image.open(image_path)
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            return image
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            return None
    
    def _make_json_serializable(self, obj):
        """Convert objects to JSON-serializable format."""
        if isinstance(obj, dict):
            return {key: self._make_json_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_serializable(item) for item in obj]
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        elif isinstance(obj, (int, float, str)):
            return obj
        else:
            # Convert any other type to string
            return str(obj)
    
    def _extract_image_metadata(self, image_path: str, image: np.ndarray) -> Dict[str, Any]:
        """Extract basic metadata from image file."""
        try:
            height, width = image.shape[:2]
            
            # Get file size
            file_size = os.path.getsize(image_path)
            
            # Calculate aspect ratio
            aspect_ratio = width / height if height > 0 else 0
            
            # Determine image type
            image_type = "color" if len(image.shape) == 3 else "grayscale"
            
            return {
                "width": int(width),
                "height": int(height),
                "file_size_bytes": int(file_size),
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "aspect_ratio": round(aspect_ratio, 2),
                "image_type": image_type,
                "channels": int(image.shape[2]) if len(image.shape) == 3 else 1,
                "resolution": f"{width}x{height}",
                "megapixels": round((width * height) / 1000000, 2)
            }
            
        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")
            return {"error": f"Failed to extract metadata: {str(e)}"}
    
    def _init_gemini_model(self):
        """Initialize Gemini AI model for image analysis."""
        try:
            # Load environment variables
            load_dotenv()
            
            # Get API key from environment
            api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("No Gemini API key found. AI analysis will be disabled.")
                self._model = None
                return
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            
            # Initialize the model
            self._model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini model initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            self._model = None
    
    def _analyze_with_gemini(self, image_path: str) -> Dict[str, Any]:
        """Analyze image using Gemini AI model."""
        try:
            if self._model is None:
                return {
                    "error": "Gemini AI model not available. Please check API key configuration.",
                    "has_ai_analysis": False
                }
            
            # Load image for Gemini
            pil_image = Image.open(image_path)
            
            # Create comprehensive analysis prompt
            prompt = """
            You are an expert AI image analyst. Please analyze this image comprehensively and provide a detailed description in JSON format with the following structure:
            
            {
                "overall_description": "A detailed description of what you see in the image",
                "main_subjects": ["list of main subjects or objects in the image"],
                "scene_type": "type of scene (e.g., indoor, outdoor, portrait, landscape, etc.)",
                "colors_and_lighting": "description of dominant colors and lighting conditions",
                "text_content": "any visible text in the image",
                "emotions_or_mood": "emotional tone or mood conveyed by the image",
                "context_or_setting": "where and when this might have been taken",
                "notable_details": ["list of interesting or important details"],
                "educational_value": "what someone could learn from this image",
                "suggested_topics": ["list of topics this image could be used to teach or discuss"]
            }
            
            Please be thorough and educational in your analysis. Focus on what would be useful for a tutor to know about this image.
            """
            
            # Generate analysis
            response = self._model.generate_content([prompt, pil_image])
            
            # Parse the response
            if response and response.text:
                try:
                    # Extract JSON from response
                    response_text = response.text.strip()
                    
                    # Remove markdown code blocks if present
                    if response_text.startswith('```json'):
                        response_text = response_text[7:-3].strip()
                    elif response_text.startswith('```'):
                        response_text = response_text[3:-3].strip()
                    
                    # Parse JSON
                    analysis_data = json.loads(response_text)
                    analysis_data["has_ai_analysis"] = True
                    analysis_data["raw_response"] = response.text
                    
                    return analysis_data
                    
                except json.JSONDecodeError:
                    # If JSON parsing fails, return the raw text
                    return {
                        "overall_description": response.text,
                        "has_ai_analysis": True,
                        "raw_response": response.text,
                        "parse_error": "Could not parse JSON, returning raw text"
                    }
            else:
                return {
                    "error": "No response from Gemini AI",
                    "has_ai_analysis": False
                }
                
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return {
                "error": f"AI analysis failed: {str(e)}",
                "has_ai_analysis": False
            }
    
    def _generate_suggested_questions_from_ai(self, ai_analysis: Dict[str, Any]) -> List[str]:
        """Generate suggested questions based on AI analysis."""
        questions = [
            "What can you tell me about this image?",
            "Can you explain what's happening in this picture?",
            "What educational value does this image have?"
        ]
        
        # Add specific questions based on AI analysis
        if ai_analysis.get("main_subjects"):
            subjects = ai_analysis["main_subjects"]
            if isinstance(subjects, list) and subjects:
                questions.append(f"Can you tell me more about {subjects[0]}?")
        
        if ai_analysis.get("suggested_topics"):
            topics = ai_analysis["suggested_topics"]
            if isinstance(topics, list) and topics:
                questions.append(f"How can this image help me learn about {topics[0]}?")
        
        if ai_analysis.get("text_content") and ai_analysis["text_content"].strip():
            questions.append("What does the text in this image mean?")
        
        return questions[:5]  # Return max 5 questions
    
    def _encode_image_to_base64(self, image: np.ndarray) -> str:
        """Encode image to base64 for display in frontend."""
        try:
            # Resize image if too large
            height, width = image.shape[:2]
            if max(width, height) > self.max_dimension:
                scale = self.max_dimension / max(width, height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image = cv2.resize(image, (new_width, new_height))
            
            # Convert BGR to RGB for PIL
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)
            
            # Convert to base64
            buffer = io.BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/jpeg;base64,{img_str}"
        except Exception as e:
            logger.error(f"Base64 encoding failed: {e}")
            return ""


# Convenience function for easy integration
def process_image(image_file) -> Dict[str, Any]:
    """
    Convenience function to process an image file.
    
    Args:
        image_file: Flask file object containing the image
        
    Returns:
        Dict containing processing results
    """
    processor = ImageProcessor()
    return processor.process_image(image_file)
