import cv2
import numpy as np
import tempfile
import os
import base64
from PIL import Image
import io
import json
from typing import List, Dict, Any, Optional
import threading
import pytesseract
import re
import subprocess

class VideoProcessor:
    """Handles video processing, frame extraction, and content analysis."""
    
    def __init__(self):
        self.supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
        self.max_frames = 20  # Maximum frames to extract for analysis
        self.frame_interval = 5  # Extract every nth frame
        self._yolo_model = None
        self._yolo_lock = threading.Lock()
    
    def process_video(self, video_file) -> Dict[str, Any]:
        """
        Process uploaded video and extract meaningful content.
        
        Args:
            video_file: Flask file object containing the video
            
        Returns:
            Dict containing analysis results and extracted information
        """
        tmp_file_path = None
        try:
            # Validate file format
            if not self._is_valid_video_format(video_file.filename):
                return {
                    "success": False,
                    "error": f"Unsupported video format. Supported formats: {', '.join(self.supported_formats)}"
                }
            
            # Save video temporarily with a more robust approach
            import uuid
            temp_dir = tempfile.gettempdir()
            unique_name = f"mentorae_video_{uuid.uuid4().hex}{self._get_file_extension(video_file.filename)}"
            tmp_file_path = os.path.join(temp_dir, unique_name)
            
            # Save the file
            video_file.save(tmp_file_path)
            
            # Extract video metadata
            metadata = self._extract_video_metadata(tmp_file_path)
            
            # Extract frames
            frames = self._extract_frames(tmp_file_path)
            
            # Analyze content
            analysis = self._analyze_video_content(frames, metadata)

            # Extract text from frames (OCR)
            try:
                text_analysis = self._extract_text_from_frames(frames)
                if text_analysis:
                    analysis["text_analysis"] = text_analysis
            except Exception:
                pass

            # Transcribe audio (best-effort)
            try:
                transcription = self._transcribe_audio(tmp_file_path)
                if transcription:
                    analysis["audio_transcription"] = transcription
            except Exception:
                pass
            
            # Prepare a preview frame (first analyzed frame) as base64 for UI
            preview_base64 = None
            try:
                if frames:
                    preview_base64 = self._encode_frame_to_base64(frames[0])
            except Exception:
                preview_base64 = None

            return {
                "success": True,
                "metadata": self._make_json_serializable(metadata),
                "analysis": self._make_json_serializable(analysis),
                "frame_count": len(frames),
                "suggested_questions": self._generate_suggested_questions(analysis),
                "preview_frame_base64": preview_base64
            }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Video processing failed: {str(e)}"
            }
        finally:
            # Clean up temporary file with retry mechanism
            if tmp_file_path and os.path.exists(tmp_file_path):
                # Small delay to ensure all file handles are released
                import time
                time.sleep(0.1)
                self._safe_cleanup(tmp_file_path)
    
    def _is_valid_video_format(self, filename: str) -> bool:
        """Check if the file format is supported."""
        if not filename:
            return False
        ext = os.path.splitext(filename.lower())[1]
        return ext in self.supported_formats
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename."""
        return os.path.splitext(filename)[1]
    
    def _safe_cleanup(self, file_path: str, max_retries: int = 5) -> None:
        """Safely delete a file with retry mechanism for Windows compatibility."""
        import time
        import gc
        
        # Force garbage collection to release any file handles
        gc.collect()
        
        for attempt in range(max_retries):
            try:
                if os.path.exists(file_path):
                    os.unlink(file_path)
                    print(f"Successfully deleted temporary file: {file_path}")
                    return  # Success
            except (OSError, PermissionError, FileNotFoundError) as e:
                if attempt < max_retries - 1:
                    # Wait progressively longer before retrying
                    wait_time = 0.5 * (2 ** attempt)  # Exponential backoff
                    print(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                    continue
                else:
                    # Last attempt failed, log but don't raise
                    print(f"Warning: Could not delete temporary file {file_path} after {max_retries} attempts: {e}")
                    # Try to schedule for deletion on next restart
                    try:
                        import atexit
                        atexit.register(lambda: self._force_delete(file_path))
                    except:
                        pass
                    break
    
    def _force_delete(self, file_path: str) -> None:
        """Force delete a file (used as last resort)."""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                print(f"Force deleted file: {file_path}")
        except:
            pass
    
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
    
    def _extract_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Extract basic metadata from video file."""
        cap = None
        try:
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return {"error": "Could not open video file"}
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            return {
                "fps": float(fps) if fps is not None else 0.0,
                "frame_count": int(frame_count) if frame_count is not None else 0,
                "width": int(width) if width is not None else 0,
                "height": int(height) if height is not None else 0,
                "duration": float(duration) if duration is not None else 0.0,
                "resolution": f"{int(width)}x{int(height)}" if width and height else "Unknown",
                "aspect_ratio": float(width / height) if height and height > 0 else 0.0
            }
            
        except Exception as e:
            return {"error": f"Failed to extract metadata: {str(e)}"}
        finally:
            if cap is not None:
                cap.release()
    
    def _extract_frames(self, video_path: str) -> List[np.ndarray]:
        """Extract key frames from video for analysis."""
        cap = None
        try:
            cap = cv2.VideoCapture(video_path)
            frames = []
            frame_count = 0
            
            if not cap.isOpened():
                return []
            
            while len(frames) < self.max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Extract every nth frame
                if frame_count % self.frame_interval == 0:
                    # Resize frame for analysis (optional, for performance)
                    resized_frame = cv2.resize(frame, (640, 480))
                    frames.append(resized_frame)
                
                frame_count += 1
            
            return frames
            
        except Exception as e:
            print(f"Error extracting frames: {e}")
            return []
        finally:
            if cap is not None:
                cap.release()

    def _encode_frame_to_base64(self, frame: np.ndarray, target_width: int = 640) -> Optional[str]:
        """Encode a single BGR frame to base64 JPEG for preview."""
        try:
            if frame is None or frame.size == 0:
                return None
            # Resize while maintaining aspect ratio
            h, w = frame.shape[:2]
            if w > target_width:
                scale = target_width / float(w)
                new_size = (int(w * scale), int(h * scale))
                frame = cv2.resize(frame, new_size)
            # Convert BGR to RGB then to PIL
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb)
            buffer = io.BytesIO()
            pil_image.save(buffer, format='JPEG', quality=80)
            img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/jpeg;base64,{img_str}"
        except Exception:
            return None
    
    def _analyze_video_content(self, frames: List[np.ndarray], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze video frames for content understanding."""
        if not frames:
            return {"error": "No frames extracted for analysis"}
        
        try:
            # Basic visual analysis
            analysis = {
                "total_frames_analyzed": len(frames),
                "brightness_analysis": self._analyze_brightness(frames),
                "motion_analysis": self._analyze_motion(frames),
                "color_analysis": self._analyze_colors(frames),
                "scene_changes": self._detect_scene_changes(frames),
                "content_type": self._classify_content_type(frames, metadata)
            }
            # Try object detection (best-effort)
            detections = self._detect_objects_yolo(frames)
            if detections:
                analysis["object_detection"] = detections
            
            return analysis
            
        except Exception as e:
            return {"error": f"Content analysis failed: {str(e)}"}

    def _extract_text_from_frames(self, frames: List[np.ndarray]) -> Optional[Dict[str, Any]]:
        """Run OCR on a subset of frames and aggregate text results."""
        if not frames:
            return None
        try:
            # Sample up to 5 frames
            sample_indices = np.linspace(0, len(frames) - 1, num=min(5, len(frames)), dtype=int)
            texts = []
            for idx in sample_indices:
                frame = frames[int(idx)]
                # Convert BGR to RGB and PIL
                pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                raw_text = pytesseract.image_to_string(pil_image, config='--psm 6')
                cleaned = re.sub(r'\s+', ' ', raw_text).strip()
                if cleaned:
                    texts.append(cleaned)
            if not texts:
                return {"has_text": False, "sample_text": ""}
            full_text = " ".join(texts)
            words = re.findall(r"[A-Za-z0-9\-']+", full_text)
            unique = sorted(set(w.lower() for w in words))
            # Top words by frequency (simple)
            freq: Dict[str, int] = {}
            for w in (w.lower() for w in words):
                freq[w] = freq.get(w, 0) + 1
            top_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:15]
            return {
                "has_text": True,
                "word_count": int(len(words)),
                "unique_word_count": int(len(unique)),
                "top_words": [{"word": k, "count": int(v)} for k, v in top_words],
                "sample_text": full_text[:500]
            }
        except Exception:
            return None

    def _transcribe_audio(self, video_path: str) -> Optional[Dict[str, Any]]:
        """Extract audio using ffmpeg and transcribe with Whisper if available."""
        try:
            # Prepare temp wav path
            temp_dir = tempfile.gettempdir()
            wav_path = os.path.join(temp_dir, f"mentorae_audio_{os.path.basename(video_path)}.wav")
            # Extract audio via ffmpeg (if available)
            try:
                cmd = [
                    "ffmpeg", "-y", "-i", video_path,
                    "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", wav_path
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            except Exception:
                return None
            # Load whisper (best-effort)
            try:
                import whisper
                # Use tiny or base for speed
                model = whisper.load_model("base")
                result = model.transcribe(wav_path)
                text = (result or {}).get("text", "").strip()
                return {"has_transcript": bool(text), "text": text[:2000]}
            except Exception:
                return None
            finally:
                try:
                    if os.path.exists(wav_path):
                        os.unlink(wav_path)
                except Exception:
                    pass
        except Exception:
            return None

    def _load_yolo_model(self):
        """Lazily load YOLO model with thread safety. Returns model or None."""
        if self._yolo_model is not None:
            return self._yolo_model
        with self._yolo_lock:
            if self._yolo_model is not None:
                return self._yolo_model
            try:
                from ultralytics import YOLO
                # Allow overrides via env
                env_model_path = os.getenv("YOLO_MODEL_PATH")
                env_model_name = os.getenv("YOLO_MODEL_NAME")  # e.g., yolov8m, yolov8l
                if env_model_path:
                    try:
                        self._yolo_model = YOLO(env_model_path)
                        return self._yolo_model
                    except Exception:
                        self._yolo_model = None
                if env_model_name:
                    try:
                        self._yolo_model = YOLO(env_model_name)
                        return self._yolo_model
                    except Exception:
                        self._yolo_model = None

                # Prefer strongest local weights if available (x6 > x > l > m > s > n)
                project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                weights_candidates = [
                    os.path.join(project_root, "yolov8x6.pt"),
                    os.path.join(project_root, "yolov8x.pt"),
                    os.path.join(project_root, "yolov8l.pt"),
                    os.path.join(project_root, "yolov8m.pt"),
                    os.path.join(project_root, "yolov8s.pt"),
                    os.path.join(project_root, "yolov8n.pt"),
                    os.path.join(os.getcwd(), "yolov8x6.pt"),
                    os.path.join(os.getcwd(), "yolov8x.pt"),
                    os.path.join(os.getcwd(), "yolov8l.pt"),
                    os.path.join(os.getcwd(), "yolov8m.pt"),
                    os.path.join(os.getcwd(), "yolov8s.pt"),
                    os.path.join(os.getcwd(), "yolov8n.pt"),
                    "yolov8x6.pt", "yolov8x.pt", "yolov8l.pt", "yolov8m.pt", "yolov8s.pt", "yolov8n.pt",
                    # Fallback to hub names, defaulting to s
                    "yolov8x6", "yolov8x", "yolov8l", "yolov8m", "yolov8s", "yolov8n"
                ]
                for path in weights_candidates:
                    try:
                        self._yolo_model = YOLO(path)
                        break
                    except Exception:
                        self._yolo_model = None
                        continue
                return self._yolo_model
            except Exception:
                # ultralytics not installed or failed
                self._yolo_model = None
                return None

    def _detect_objects_yolo(self, frames: List[np.ndarray]) -> Optional[Dict[str, Any]]:
        """Run YOLO object detection on a subset of frames and aggregate results."""
        try:
            model = self._load_yolo_model()
            if model is None or not frames:
                return None
            # Select device automatically (CUDA if available) and allow confidence override
            try:
                import torch
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
            except Exception:
                device = 'cpu'
            conf_env = os.getenv('YOLO_CONF', '')
            try:
                conf = float(conf_env) if conf_env else 0.25
            except Exception:
                conf = 0.25
            # Sample up to 5 frames for performance
            sample_indices = np.linspace(0, len(frames) - 1, num=min(5, len(frames)), dtype=int)
            sampled_frames = [frames[i] for i in sample_indices]
            results = model.predict(sampled_frames, verbose=False, device=device, conf=conf)
            label_counts: Dict[str, int] = {}
            sample_detections = []
            for idx, res in enumerate(results):
                frame_summary = []
                try:
                    boxes = res.boxes
                    names = res.names if hasattr(res, 'names') else {}
                    if boxes is None:
                        continue
                    for b in boxes:
                        try:
                            cls_id = int(b.cls.item()) if hasattr(b.cls, 'item') else int(b.cls)
                            conf = float(b.conf.item()) if hasattr(b.conf, 'item') else float(b.conf)
                            label = names.get(cls_id, str(cls_id))
                            label_counts[label] = label_counts.get(label, 0) + 1
                            if len(frame_summary) < 10:
                                frame_summary.append({
                                    "label": label,
                                    "confidence": round(conf, 3)
                                })
                        except Exception:
                            continue
                finally:
                    if frame_summary:
                        sample_detections.append({
                            "frame_index": int(sample_indices[idx]),
                            "detections": frame_summary
                        })
            # Build top labels summary
            top_labels = sorted(label_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            return {
                "labels": [{"label": k, "count": int(v)} for k, v in top_labels],
                "total_detections": int(sum(label_counts.values())),
                "sampled_frames": sample_detections
            }
        except Exception:
            return None
    
    def _analyze_brightness(self, frames: List[np.ndarray]) -> Dict[str, float]:
        """Analyze brightness levels across frames."""
        if not frames:
            return {}
        
        brightness_values = []
        for frame in frames:
            # Convert to grayscale and calculate mean brightness
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            brightness_values.append(brightness)
        
        return {
            "average_brightness": float(np.mean(brightness_values)),
            "min_brightness": float(np.min(brightness_values)),
            "max_brightness": float(np.max(brightness_values)),
            "brightness_variance": float(np.var(brightness_values))
        }
    
    def _analyze_motion(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """Analyze motion between consecutive frames."""
        if len(frames) < 2:
            return {"motion_detected": False}
        
        motion_scores = []
        for i in range(1, len(frames)):
            # Calculate optical flow or frame difference
            prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            
            # Calculate frame difference
            diff = cv2.absdiff(prev_gray, curr_gray)
            motion_score = np.mean(diff)
            motion_scores.append(motion_score)
        
        return {
            "motion_detected": bool(np.mean(motion_scores) > 10),  # Threshold for motion detection
            "average_motion": float(np.mean(motion_scores)),
            "max_motion": float(np.max(motion_scores)),
            "motion_variance": float(np.var(motion_scores))
        }
    
    def _analyze_colors(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """Analyze dominant colors in the video."""
        if not frames:
            return {}
        
        # Sample a few frames for color analysis
        sample_frames = frames[::max(1, len(frames)//3)]  # Sample 3 frames max
        
        dominant_colors = []
        for frame in sample_frames:
            # Reshape image to be a list of pixels
            pixels = frame.reshape(-1, 3)
            
            # Get dominant colors using k-means (simplified)
            # For now, just get average color
            avg_color = np.mean(pixels, axis=0)
            dominant_colors.append(avg_color.tolist())
        
        return {
            "dominant_colors": [[float(c) for c in color] for color in dominant_colors],
            "color_variety": int(len(set(tuple(color) for color in dominant_colors)))
        }
    
    def _detect_scene_changes(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """Detect potential scene changes in the video."""
        if len(frames) < 2:
            return {"scene_changes": 0}
        
        scene_changes = 0
        change_threshold = 30  # Threshold for scene change detection
        
        for i in range(1, len(frames)):
            prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            
            # Calculate histogram difference
            hist_prev = cv2.calcHist([prev_gray], [0], None, [256], [0, 256])
            hist_curr = cv2.calcHist([curr_gray], [0], None, [256], [0, 256])
            
            # Compare histograms
            correlation = cv2.compareHist(hist_prev, hist_curr, cv2.HISTCMP_CORREL)
            
            if correlation < 0.7:  # Threshold for scene change
                scene_changes += 1
        
        return {
            "scene_changes": int(scene_changes),
            "change_frequency": float(scene_changes / len(frames)) if frames else 0.0
        }
    
    def _classify_content_type(self, frames: List[np.ndarray], metadata: Dict[str, Any]) -> str:
        """Classify the type of video content based on analysis."""
        if not frames:
            return "unknown"
        
        # Simple classification based on video characteristics
        duration = metadata.get("duration", 0)
        resolution = metadata.get("resolution", "0x0")
        width, height = map(int, resolution.split('x'))
        
        # Basic classification logic
        if duration < 30:
            return "short_clip"
        elif duration > 300:  # 5 minutes
            return "long_form_content"
        elif width > 1920 or height > 1080:
            return "high_definition"
        elif width < 640 or height < 480:
            return "low_resolution"
        else:
            return "standard_video"
    
    def _generate_suggested_questions(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate suggested questions based on video analysis."""
        questions = [
            "What is happening in this video?",
            "Can you describe the main content or subjects?",
            "What is the context or purpose of this video?"
        ]
        
        # Add specific questions based on analysis
        if analysis.get("motion_analysis", {}).get("motion_detected"):
            questions.append("What kind of movement or action is shown?")
        
        if analysis.get("scene_changes", {}).get("scene_changes", 0) > 2:
            questions.append("How many different scenes or locations are shown?")
        
        content_type = analysis.get("content_type", "")
        if content_type == "short_clip":
            questions.append("What is the main point of this short clip?")
        elif content_type == "long_form_content":
            questions.append("Can you summarize the key points of this longer video?")
        
        return questions[:5]  # Return max 5 questions


# Convenience function for easy integration
def process_video(video_file) -> Dict[str, Any]:
    """
    Convenience function to process a video file.
    
    Args:
        video_file: Flask file object containing the video
        
    Returns:
        Dict containing processing results
    """
    processor = VideoProcessor()
    return processor.process_video(video_file)

