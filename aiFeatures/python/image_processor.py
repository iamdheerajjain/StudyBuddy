"""
Image Processing Module for Mentorae
Handles image analysis, content recognition, and metadata extraction
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
import pytesseract
import requests
from bs4 import BeautifulSoup
import re

# Set up logging
logger = logging.getLogger(__name__)

class ImageProcessor:
    """Handles image processing, analysis, and content recognition."""
    
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit
        self.max_dimension = 2048  # Maximum width or height
    
    def process_image(self, image_file) -> Dict[str, Any]:
        """
        Process uploaded image and extract meaningful content.
        
        Args:
            image_file: Flask file object containing the image
            
        Returns:
            Dict containing analysis results and extracted information
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
            unique_name = f"mentorae_image_{uuid.uuid4().hex}{self._get_file_extension(image_file.filename)}"
            tmp_file_path = os.path.join(temp_dir, unique_name)
            
            # Save the file
            image_file.save(tmp_file_path)
            
            # Load and process image
            image = self._load_image(tmp_file_path)
            if image is None:
                return {
                    "success": False,
                    "error": "Could not load image file"
                }
            
            # Extract image metadata
            metadata = self._extract_image_metadata(tmp_file_path, image)
            
            # Analyze image content
            analysis = self._analyze_image_content(image)
            
            # Generate base64 encoded image for display
            image_base64 = self._encode_image_to_base64(image)
            
            return {
                "success": True,
                "metadata": self._make_json_serializable(metadata),
                "analysis": self._make_json_serializable(analysis),
                "image_base64": image_base64,
                "suggested_questions": self._generate_suggested_questions(analysis)
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
    
    def _analyze_image_content(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze image content for various characteristics."""
        try:
            analysis = {
                "brightness_analysis": self._analyze_brightness(image),
                "color_analysis": self._analyze_colors(image),
                "edge_analysis": self._analyze_edges(image),
                "texture_analysis": self._analyze_texture(image),
                "object_detection": self._detect_objects(image),
                "scene_classification": self._classify_scene(image),
                "text_extraction": self._extract_text_from_image(image)
            }
            
            # Web scrape information about extracted labels
            if analysis["text_extraction"].get("labels"):
                analysis["label_research"] = self._web_scrape_label_info(analysis["text_extraction"]["labels"])
            
            return analysis
            
        except Exception as e:
            logger.error(f"Content analysis failed: {e}")
            return {"error": f"Content analysis failed: {str(e)}"}
    
    def _analyze_brightness(self, image: np.ndarray) -> Dict[str, float]:
        """Analyze brightness levels in the image."""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate brightness statistics
            mean_brightness = np.mean(gray)
            std_brightness = np.std(gray)
            
            # Determine brightness category
            if mean_brightness < 85:
                brightness_category = "dark"
            elif mean_brightness < 170:
                brightness_category = "medium"
            else:
                brightness_category = "bright"
            
            return {
                "mean_brightness": float(mean_brightness),
                "std_brightness": float(std_brightness),
                "min_brightness": float(np.min(gray)),
                "max_brightness": float(np.max(gray)),
                "brightness_category": brightness_category
            }
        except Exception as e:
            logger.error(f"Brightness analysis failed: {e}")
            return {"error": str(e)}
    
    def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze dominant colors in the image."""
        try:
            # Reshape image to be a list of pixels
            pixels = image.reshape(-1, 3)
            
            # Calculate average color
            avg_color = np.mean(pixels, axis=0)
            
            # Calculate color variance
            color_variance = np.var(pixels, axis=0)
            
            # Determine dominant color
            dominant_color = self._get_dominant_color(pixels)
            
            # Calculate colorfulness (variance of color channels)
            colorfulness = np.mean(color_variance)
            
            return {
                "average_color": [float(c) for c in avg_color],
                "dominant_color": dominant_color,
                "color_variance": [float(v) for v in color_variance],
                "colorfulness": float(colorfulness),
                "color_category": self._categorize_colors(avg_color)
            }
        except Exception as e:
            logger.error(f"Color analysis failed: {e}")
            return {"error": str(e)}
    
    def _get_dominant_color(self, pixels: np.ndarray) -> Dict[str, Any]:
        """Get the most dominant color in the image."""
        try:
            # Simple approach: find the most common color
            # Reshape and find unique colors
            unique_colors, counts = np.unique(pixels.reshape(-1, 3), axis=0, return_counts=True)
            dominant_idx = np.argmax(counts)
            dominant_color = unique_colors[dominant_idx]
            
            return {
                "rgb": [int(c) for c in dominant_color],
                "hex": f"#{int(dominant_color[2]):02x}{int(dominant_color[1]):02x}{int(dominant_color[0]):02x}",
                "percentage": float(counts[dominant_idx] / len(pixels) * 100)
            }
        except Exception as e:
            logger.error(f"Dominant color detection failed: {e}")
            return {"error": str(e)}
    
    def _categorize_colors(self, avg_color: np.ndarray) -> str:
        """Categorize the overall color tone of the image."""
        b, g, r = avg_color
        
        if r > g and r > b and r > 150:
            return "warm_red"
        elif g > r and g > b and g > 150:
            return "warm_green"
        elif b > r and b > g and b > 150:
            return "cool_blue"
        elif r > 200 and g > 200 and b > 200:
            return "bright_white"
        elif r < 50 and g < 50 and b < 50:
            return "dark_black"
        elif abs(r - g) < 30 and abs(g - b) < 30:
            return "neutral_gray"
        else:
            return "mixed_colors"
    
    def _analyze_edges(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze edge content in the image."""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Canny edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Calculate edge density
            edge_pixels = np.sum(edges > 0)
            total_pixels = edges.shape[0] * edges.shape[1]
            edge_density = edge_pixels / total_pixels
            
            # Determine edge category
            if edge_density < 0.05:
                edge_category = "smooth"
            elif edge_density < 0.15:
                edge_category = "moderate_detail"
            else:
                edge_category = "high_detail"
            
            return {
                "edge_density": float(edge_density),
                "edge_pixels": int(edge_pixels),
                "edge_category": edge_category
            }
        except Exception as e:
            logger.error(f"Edge analysis failed: {e}")
            return {"error": str(e)}
    
    def _analyze_texture(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze texture patterns in the image."""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate texture using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Determine texture category
            if laplacian_var < 100:
                texture_category = "smooth"
            elif laplacian_var < 1000:
                texture_category = "moderate_texture"
            else:
                texture_category = "rough_textured"
            
            return {
                "texture_variance": float(laplacian_var),
                "texture_category": texture_category
            }
        except Exception as e:
            logger.error(f"Texture analysis failed: {e}")
            return {"error": str(e)}
    
    def _detect_objects(self, image: np.ndarray) -> Dict[str, Any]:
        """Basic object detection using OpenCV."""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use Haar cascades for basic object detection
            # Face detection
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            # Eye detection
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            eyes = eye_cascade.detectMultiScale(gray, 1.1, 4)
            
            return {
                "faces_detected": len(faces),
                "eyes_detected": len(eyes),
                "has_people": len(faces) > 0,
                "face_locations": [[int(x), int(y), int(w), int(h)] for (x, y, w, h) in faces],
                "eye_locations": [[int(x), int(y), int(w), int(h)] for (x, y, w, h) in eyes]
            }
        except Exception as e:
            logger.error(f"Object detection failed: {e}")
            return {"error": str(e)}
    
    def _classify_scene(self, image: np.ndarray) -> Dict[str, Any]:
        """Classify the type of scene in the image with more detailed analysis."""
        try:
            height, width = image.shape[:2]
            
            # Basic scene classification based on image characteristics
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate various features
            brightness = np.mean(gray)
            contrast = np.std(gray)
            edge_density = np.sum(cv2.Canny(gray, 50, 150) > 0) / (height * width)
            
            # Enhanced classification logic
            scene_type = "general_scene"
            scene_description = "a general scene"
            confidence = 0.5
            
            # Aspect ratio analysis
            aspect_ratio = width / height
            
            # Brightness-based classification
            if brightness > 200 and contrast < 50:
                scene_type = "bright_scene"
                scene_description = "a very bright scene, possibly outdoors in daylight or a well-lit indoor space"
                confidence = 0.7
            elif brightness < 50 and contrast < 30:
                scene_type = "dark_scene"
                scene_description = "a dark scene, possibly taken at night or in low lighting"
                confidence = 0.7
            elif brightness > 150 and contrast > 80:
                scene_type = "high_contrast_scene"
                scene_description = "a high-contrast scene with strong light and shadow"
                confidence = 0.6
            
            # Edge density analysis
            if edge_density > 0.15:
                scene_type = "detailed_scene"
                scene_description = "a detailed scene with many visual elements and sharp features"
                confidence = 0.7
            elif edge_density < 0.05:
                scene_type = "smooth_scene"
                scene_description = "a smooth scene with soft, blurred features"
                confidence = 0.6
            
            # Aspect ratio analysis
            if aspect_ratio > 1.5:
                scene_type = "landscape_scene"
                scene_description = "a landscape or wide-angle view"
                confidence = 0.6
            elif aspect_ratio < 0.8:
                scene_type = "portrait_scene"
                scene_description = "a portrait or tall view"
                confidence = 0.6
            
            # Color analysis for scene context
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            mean_hue = np.mean(hsv[:, :, 0])
            mean_saturation = np.mean(hsv[:, :, 1])
            
            if mean_saturation > 100:  # High saturation
                if 20 < mean_hue < 80:  # Green range
                    scene_description += " with vibrant green colors, possibly nature or vegetation"
                elif 100 < mean_hue < 140:  # Blue range
                    scene_description += " with blue tones, possibly sky or water"
                elif mean_hue < 20 or mean_hue > 160:  # Red range
                    scene_description += " with warm red/orange tones"
            
            return {
                "scene_type": scene_type,
                "scene_description": scene_description,
                "confidence": confidence,
                "features": {
                    "brightness": float(brightness),
                    "contrast": float(contrast),
                    "edge_density": float(edge_density),
                    "aspect_ratio": float(aspect_ratio),
                    "mean_hue": float(mean_hue),
                    "mean_saturation": float(mean_saturation)
                }
            }
        except Exception as e:
            logger.error(f"Scene classification failed: {e}")
            return {"error": str(e)}
    
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
    
    def _extract_text_from_image(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract text labels from image using OCR."""
        try:
            # Convert to PIL Image for better OCR results
            pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            # Use pytesseract to extract text
            extracted_text = pytesseract.image_to_string(pil_image, config='--psm 6')
            
            # Clean up the text
            cleaned_text = re.sub(r'\s+', ' ', extracted_text.strip())
            
            # Split into individual labels/words
            labels = [label.strip() for label in cleaned_text.split() if len(label.strip()) > 2]
            
            # Filter out common OCR noise
            filtered_labels = []
            for label in labels:
                # Skip if it's mostly numbers or very short
                if len(label) < 3 or label.isdigit():
                    continue
                # Skip common OCR artifacts
                if not re.match(r'^[a-zA-Z0-9\s\-_\.]+$', label):
                    continue
                filtered_labels.append(label)
            
            return {
                "raw_text": extracted_text,
                "cleaned_text": cleaned_text,
                "labels": filtered_labels,
                "label_count": len(filtered_labels)
            }
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return {"error": str(e), "labels": [], "label_count": 0}
    
    def _web_scrape_label_info(self, labels: List[str]) -> Dict[str, Any]:
        """Web scrape information about the extracted labels."""
        try:
            label_info = {}
            
            for label in labels[:5]:  # Limit to first 5 labels to avoid rate limiting
                try:
                    # Search for the label
                    search_query = f"{label} definition meaning"
                    search_url = f"https://www.google.com/search?q={search_query}"
                    
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                    
                    response = requests.get(search_url, headers=headers, timeout=10)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract definition or description
                    definition = ""
                    
                    # Try to find definition in search results
                    definition_elements = soup.find_all(['div', 'span'], string=re.compile(r'definition|meaning|is a|refers to', re.I))
                    if definition_elements:
                        definition = definition_elements[0].get_text()[:200] + "..."
                    
                    # If no definition found, try to get snippet
                    if not definition:
                        snippet_elements = soup.find_all('div', class_='BNeawe')
                        if snippet_elements:
                            definition = snippet_elements[0].get_text()[:200] + "..."
                    
                    label_info[label] = {
                        "definition": definition if definition else f"Information about '{label}' not found",
                        "search_successful": bool(definition)
                    }
                    
                except Exception as e:
                    logger.error(f"Web scraping failed for label '{label}': {e}")
                    label_info[label] = {
                        "definition": f"Could not find information about '{label}'",
                        "search_successful": False
                    }
            
            return label_info
        except Exception as e:
            logger.error(f"Web scraping failed: {e}")
            return {"error": str(e)}

    def _generate_suggested_questions(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate suggested questions based on image analysis."""
        questions = [
            "What labels or text can you see in this image?",
            "Can you explain what these labels mean?",
            "What information do these labels provide?"
        ]
        
        # Add specific questions based on extracted labels
        if analysis.get("text_extraction", {}).get("labels"):
            labels = analysis["text_extraction"]["labels"]
            if labels:
                questions.append(f"Can you tell me more about '{labels[0]}'?")
                if len(labels) > 1:
                    questions.append(f"What is the relationship between '{labels[0]}' and '{labels[1]}'?")
        
        # Add questions based on web scraped information
        if analysis.get("label_research"):
            questions.append("What additional information can you find about these labels?")
            questions.append("Are there any interesting facts about these terms?")
        
        return questions[:5]  # Return max 5 questions


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
