import os
from dotenv import load_dotenv, find_dotenv
import re
import sys
import json
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import threading
import tempfile
import warnings

# Suppress Google Cloud warnings
warnings.filterwarnings("ignore", category=UserWarning)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Ensure environment variables from project root .env are loaded regardless of CWD
try:
    # Load nearest .env (will search upward to project root)
    env_path = find_dotenv(filename=".env", usecwd=True)
    if env_path:
        load_dotenv(env_path, override=True)
    # Optionally also load a local .env next to this file if present
    local_env = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.isfile(local_env):
        load_dotenv(local_env, override=True)
except Exception:
    pass

# Add aiFeatures/python to sys.path for module imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from aiFeatures.python.ai_response import generate_response_without_retrieval, generate_response_with_retrieval, ChatSessionManager
from aiFeatures.python.ai_response import get_llm_status
from aiFeatures.python.speech_to_text import speech_to_text
from aiFeatures.python.speech_to_text import stop_speech_recognition
from aiFeatures.python.text_to_speech import say, stop_speech
from aiFeatures.python.enhanced_web_search import enhanced_web_search, get_search_content_for_ai
from aiFeatures.python.rag_pipeline import index_pdfs, retrieve_answer
from aiFeatures.python.simple_video_processor import process_video
from aiFeatures.python.image_processor import process_image

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Add a secret key for sessions
CORS(app)  # Enable CORS for frontend requests

# Global variables
vector_store = None
session_manager = ChatSessionManager()
default_session_id = "user_session_001"  # Default session ID

@app.route("/")
def home():
    return jsonify({"status": "ok", "service": "Mentorae Flask API"})

@app.route("/status", methods=["GET"])
def get_status():
    """Get the current status of the vector store."""
    global vector_store
    
    try:
        if not vector_store:
            return jsonify({
                "vector_store": None,
                "store_type": None,
                "message": "No vector store initialized"
            })
        
        store_type = getattr(vector_store, 'store_type', 'legacy_faiss')
        is_hybrid = hasattr(vector_store, 'hybrid_manager')
        
        return jsonify({
            "vector_store": "initialized",
            "store_type": store_type,
            "is_hybrid": is_hybrid,
            "message": f"Vector store active: {store_type}"
        })
    
    except Exception as e:
        return jsonify({"error": f"Status check failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    """Report presence of critical env vars (masked) and LLM init status."""
    try:
        def mask(value: str) -> str:
            if not value:
                return ""
            if len(value) <= 8:
                return "****"
            return value[:4] + "****" + value[-4:]

        keys = {
            "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY", ""),
            "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
            "TAVILY_API_KEY": os.getenv("TAVILY_API_KEY", ""),
            "SERP_API_KEY": os.getenv("SERP_API_KEY", "")
        }
        masked = {k: (mask(v) if v else None) for k, v in keys.items()}
        llm = get_llm_status()
        return jsonify({
            "env": masked,
            "llm": llm
        })
    except Exception as e:
        return jsonify({"error": f"Health check failed: {str(e)}"}), 500

@app.route("/clear-session", methods=["POST"])
def clear_session():
    """Clears a specific chat session (if provided) and optionally resets the vector store."""
    global vector_store, session_manager, default_session_id
    
    try:
        data = request.json if request.json else {}
        # If a session_id is provided clear only that session, otherwise default
        session_id = data.get("session_id") or default_session_id
        # Handle both FAISS and hybrid vector stores
        if vector_store:
            # Try to clear hybrid store first
            if hasattr(vector_store, 'hybrid_manager'):
                try:
                    hybrid_manager = getattr(vector_store, 'hybrid_manager', None)
                    if hybrid_manager and hasattr(hybrid_manager, 'clear_store'):
                        hybrid_manager.clear_store()
                    store_type = getattr(vector_store, 'store_type', 'unknown')
                    print(f"Cleared {store_type} vector store")
                except Exception as e:
                    print(f"Error clearing hybrid store: {e}")
            # For legacy FAISS, just reset the reference
            vector_store = None
        
        # Clear the session
        session_manager.delete_session(session_id)
        
        return jsonify({"success": True, "message": "Session cleared successfully", "session_id": session_id})
    
    except Exception as e:
        print(f"Error clearing session: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/initialize-rag", methods=["POST"])
def initialize_rag():
    """Handles indexing PDFs from uploaded files or a folder path."""
    global vector_store
    
    try:
        if 'files' in request.files:
            files = request.files.getlist('files')
            
            with tempfile.TemporaryDirectory() as temp_dir:
                file_paths = []
                for file in files:
                    if file.filename and file.filename.endswith('.pdf'):
                        file_path = os.path.join(temp_dir, file.filename)
                        file.save(file_path)
                        file_paths.append(file_path)

                if len(file_paths) == 1:
                    vector_store = index_pdfs(file_paths[0])  # Using unified index_pdfs function
                else:
                    vector_store = index_pdfs(file_paths)  # Using unified index_pdfs function
        
        elif 'folder' in request.form:
            folder_path = request.form.get('folder')
            if folder_path:
                vector_store = index_pdfs(folder_path)  # Using unified index_pdfs function
            else:
                return jsonify({"success": False, "message": "Invalid folder path"}), 400
        
        else:
            return jsonify({"success": False, "message": "No files or folder provided"}), 400
        
        return jsonify({"success": True, "message": "RAG initialized successfully"})
    
    except Exception as e:
        print(f"RAG initialization error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/enhanced-search", methods=["POST"])
def enhanced_search():
    """Enhanced web search with timeout protection and engine switching"""
    data = request.json if request.json else {}
    query = data.get("query")
    search_type = data.get("search_type", "educational")
    
    if not query:
        return jsonify({"error": "No query provided"}), 400
    
    try:
        # Import enhanced search with timeout protection
        from aiFeatures.python.enhanced_web_search import enhanced_web_search
        
        # Add request timeout handling
        import signal
        import threading
        
        search_result = None
        search_error = None
        
        def search_worker():
            nonlocal search_result, search_error
            try:
                search_result = enhanced_web_search(query, search_type)
            except Exception as e:
                search_error = e
        
        # Use threading for timeout on Windows
        search_thread = threading.Thread(target=search_worker)
        search_thread.start()
        search_thread.join(timeout=30)  # 30 second timeout
        
        if search_thread.is_alive():
            print(f"Search timed out for query: {query}")
            return jsonify({
                "success": False,
                "error": "Search timed out. Please try again.",
                "timeout": True
            }), 408
        
        if search_error:
            print(f"Enhanced search error: {search_error}")
            return jsonify({
                "success": False, 
                "error": f"Search failed: {str(search_error)}"
            }), 500
        
        if not search_result:
            return jsonify({
                "success": False,
                "error": "No search results found"
            }), 404
        
        return jsonify({
            "success": True,
            "search_data": search_result.to_dict(),
            "engine_used": getattr(search_result, 'search_engine', 'unknown')
        })
        
    except Exception as e:
        print(f"Enhanced search error: {e}")
        return jsonify({
            "success": False, 
            "error": f"Search failed: {str(e)}"
        }), 500

@app.route("/ask", methods=["POST"])
def ask():
    """Handles text input and returns AI response with chat history management."""
    global vector_store, session_manager, default_session_id
    data = request.json if request.json else {}
    user_query = data.get("query")
    web_search_results = data.get("web_search_results")  # New: web search results from frontend
    # Optional session id to keep conversations separate per context/modality
    session_id = data.get("session_id") or default_session_id

    if not user_query:
        return jsonify({"error": "No input provided"}), 400

    # Debug logging for web search results
    if web_search_results:
        print(f"🔍 Received web search results: {len(web_search_results.get('results', []))} results")
        print(f"   Engine used: {web_search_results.get('engine_used')}")
        print(f"   Has answer: {bool(web_search_results.get('answer'))}")
    else:
        print("❌ No web search results received")

    try:
        # Get retrieved information if vector store exists
        retrieved_info = retrieve_answer(user_query, vector_store) if vector_store else ""
        
        # Prepare web content for AI processing
        web_content = ""
        if web_search_results and web_search_results.get("results"):
            # Format web search results for AI context
            web_content = "\n\nWeb Search Results:\n"
            if web_search_results.get("answer"):
                web_content += f"AI Summary: {web_search_results['answer']}\n\n"
            
            for i, result in enumerate(web_search_results["results"][:5], 1):  # Use top 5 results
                web_content += f"{i}. {result.get('title', 'No title')}\n"
                web_content += f"   URL: {result.get('url', 'No URL')}\n"
                web_content += f"   Description: {result.get('snippet', result.get('content', 'No description'))[:200]}...\n\n"
        
        # Generate response based on whether retrieval was performed
        if retrieved_info:
            # Combine retrieved info with web content
            combined_context = retrieved_info
            if web_content:
                combined_context += web_content
                
            response = generate_response_with_retrieval(
                session_id, 
                user_query,
                combined_context, 
                session_manager
            )
            
            say(response)  # Convert response to speech

            return jsonify({
                "response": response,
                "retrieved": retrieved_info,
                "hasRetrieval": bool(retrieved_info),
                "web_sources": web_search_results.get("results", []) if web_search_results else [],
                "hasWebSources": bool(web_search_results)
            })
            
        else:
            # If no web search results provided, get search content as before
            if not web_content:
                scraped_text = get_search_content_for_ai(user_query, "educational")
            else:
                scraped_text = web_content
            
            response = generate_response_without_retrieval(
                session_id, 
                user_query, 
                scraped_text,
                session_manager
            )
            say(response)  # Convert response to speech

            return jsonify({
                "response": response,
                "scraped": scraped_text,
                "hasScraping": bool(scraped_text),
                "web_sources": web_search_results.get("results", []) if web_search_results else [],
                "hasWebSources": bool(web_search_results),
                "showSourcesSeparately": not bool(web_search_results)  # Only show sources separately if no web results provided
            })
    
    except Exception as e:
        print(f"Error processing query: {e}")
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500
    
@app.route("/speech-to-text", methods=["POST"])
def process_voice():
    """Handles voice input and converts it to text."""
    try:
        user_query = speech_to_text()
        return jsonify({"query": user_query})
    except Exception as e:
        print(f"Speech recognition error: {e}")
        return jsonify({"error": f"Failed to recognize speech: {str(e)}"}), 500

@app.route("/text-to-speech", methods=["POST"])
def process_speech():
    """Converts text to speech."""
    data = request.json if request.json else {}
    text = data.get("text")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        say(text)  # Convert text to speech
        return jsonify({"success": True})
    except Exception as e:
        print(f"Text-to-speech error: {e}")
        return jsonify({"error": f"Failed to convert text to speech: {str(e)}"}), 500
    
    
@app.route("/stop-speech", methods=["POST"])
def handle_stop_speech():
    """Stops ongoing speech output."""
    try:
        success = stop_speech()
        return jsonify({"message": "Speech stopped", "success": success})
    except Exception as e:
        print(f"Error stopping speech: {e}")
        return jsonify({"error": f"Failed to stop speech: {str(e)}"}), 500

@app.route("/stop-listening", methods=["POST"])
def handle_stop_listening():
    """Stops ongoing speech recognition listening loop."""
    try:
        stop_speech_recognition()
        return jsonify({"message": "Listening stopped", "success": True})
    except Exception as e:
        print(f"Error stopping listening: {e}")
        return jsonify({"error": f"Failed to stop listening: {str(e)}"}), 500

@app.route("/process-video", methods=["POST"])
def process_video_upload():
    """Handles video upload and processing."""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        # Check file size (limit to 100MB)
        video_file.seek(0, 2)  # Seek to end
        file_size = video_file.tell()
        video_file.seek(0)  # Reset to beginning
        
        if file_size > 100 * 1024 * 1024:  # 100MB limit
            return jsonify({"error": "Video file too large. Maximum size is 100MB."}), 413
        
        # Process the video
        try:
            result = process_video(video_file)
            
            if result.get("success"):
                # Ensure the result is JSON serializable
                try:
                    json.dumps(result)  # Test JSON serialization
                    return jsonify({
                        "success": True,
                        "message": "Video processed successfully",
                        "data": result
                    })
                except (TypeError, ValueError) as json_error:
                    print(f"JSON serialization error: {json_error}")
                    return jsonify({
                        "success": False,
                        "error": "Video processing completed but failed to serialize results"
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "error": result.get("error", "Video processing failed")
                }), 500
        except Exception as e:
            print(f"Video processing exception: {e}")
            return jsonify({
                "success": False,
                "error": f"Video processing failed: {str(e)}"
            }), 500
    
    except Exception as e:
        print(f"Video processing error: {e}")
        return jsonify({"error": f"Video processing failed: {str(e)}"}), 500

@app.route("/ask-video", methods=["POST"])
def ask_about_video():
    """Handles questions about uploaded video content."""
    global session_manager, default_session_id
    
    try:
        data = request.json if request.json else {}
        user_query = data.get("query")
        video_analysis = data.get("video_analysis")
        web_search_results = data.get("web_search_results")  # New: web search results from frontend
        # Optional session id to keep conversations separated per video
        session_id = data.get("session_id") or default_session_id
        
        if not user_query:
            return jsonify({"error": "No question provided"}), 400
        
        if not video_analysis:
            return jsonify({"error": "No video analysis provided"}), 400
        
        # Create context from video analysis
        metadata = video_analysis.get('metadata', {})
        analysis = video_analysis.get('analysis', {})
        motion_analysis = analysis.get('motion_analysis', {})
        scene_changes = analysis.get('scene_changes', {})
        brightness_analysis = analysis.get('brightness_analysis', {})
        text_analysis = analysis.get('text_analysis', {})
        audio_transcription = analysis.get('audio_transcription', {})
        
        # Debug: Print video analysis structure
        print(f"Video analysis structure: {type(video_analysis)}")
        print(f"Metadata keys: {list(metadata.keys())}")
        print(f"Analysis keys: {list(analysis.keys())}")
        print(f"Brightness analysis: {brightness_analysis}")
        
        # Create video context with proper string formatting to avoid template variable conflicts
        duration = metadata.get('duration', 'Unknown')
        resolution = metadata.get('resolution', 'Unknown')
        content_type = analysis.get('content_type', 'Unknown')
        motion_detected = motion_analysis.get('motion_detected', False)
        scene_changes_count = scene_changes.get('scene_changes', 0)
        avg_brightness = brightness_analysis.get('average_brightness', 'Unknown')
        min_brightness = brightness_analysis.get('min_brightness', 'Unknown')
        max_brightness = brightness_analysis.get('max_brightness', 'Unknown')
        # Objects (YOLO)
        object_detection = analysis.get('object_detection', {}) if isinstance(analysis, dict) else {}
        detected_labels = []
        if isinstance(object_detection, dict):
            labels = object_detection.get('labels')
            if isinstance(labels, list):
                try:
                    detected_labels = [f"{item.get('label')} ({item.get('count')})" for item in labels if isinstance(item, dict) and item.get('label')]
                except Exception:
                    detected_labels = []
        
        video_context = f"""
        Video Analysis Context:
        - Duration: {duration} seconds
        - Resolution: {resolution}
        - Content Type: {content_type}
        - Motion Detected: {motion_detected}
        - Scene Changes: {scene_changes_count}
        - Average Brightness: {avg_brightness}
        - Brightness Range: {min_brightness} to {max_brightness}
        - Detected Objects: {', '.join(detected_labels) if detected_labels else 'None'}
        - OCR Text Present: {text_analysis.get('has_text', False)}
        - OCR Sample: {text_analysis.get('sample_text', '')[:300]}
        - Transcript Present: {audio_transcription.get('has_transcript', False)}
        - Transcript Sample: {audio_transcription.get('text', '')[:300]}
        """
        
        # Create full context including web search results if available
        full_context = video_context
        if web_search_results and web_search_results.get("results"):
            web_content = "\n\nAdditional Web Information:\n"
            if web_search_results.get("answer"):
                web_content += f"AI Summary: {web_search_results['answer']}\n\n"
            
            for i, result in enumerate(web_search_results["results"][:3], 1):  # Use top 3 results for videos
                web_content += f"{i}. {result.get('title', 'No title')}\n"
                web_content += f"   Description: {result.get('snippet', result.get('content', 'No description'))[:150]}...\n\n"
            
            full_context += web_content
        
        # Generate response using video context + web context
        try:
            response = generate_response_without_retrieval(
                session_id,
                f"Based on this video analysis: {full_context}\n\nUser question: {user_query}",
                "",
                session_manager
            )
        except Exception as e:
            print(f"Error generating video response: {e}")
            # Fallback response if AI generation fails
            response = f"I can see you're asking about a video with the following characteristics:\n\n{video_context}\n\nHowever, I encountered an error while processing your question. Could you please rephrase your question about the video content?"
        
        # Convert response to speech
        say(response)
        
        return jsonify({
            "response": response,
            "video_context": video_context,
            "hasVideoAnalysis": True,
            "web_sources": web_search_results.get("results", []) if web_search_results else [],
            "hasWebSources": bool(web_search_results)
        })
    
    except Exception as e:
        print(f"Error processing video question: {e}")
        return jsonify({"error": f"Failed to process video question: {str(e)}"}), 500

@app.route("/process-image", methods=["POST"])
def process_image_upload():
    """Handles image upload and processing."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Check file size (limit to 10MB)
        image_file.seek(0, 2)  # Seek to end
        file_size = image_file.tell()
        image_file.seek(0)  # Reset to beginning
        
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            return jsonify({"error": "Image file too large. Maximum size is 10MB."}), 413
        
        # Process the image
        try:
            result = process_image(image_file)
            
            if result.get("success"):
                # Ensure the result is JSON serializable
                try:
                    json.dumps(result)  # Test JSON serialization
                    return jsonify({
                        "success": True,
                        "message": "Image processed successfully",
                        "data": result
                    })
                except (TypeError, ValueError) as json_error:
                    print(f"JSON serialization error: {json_error}")
                    return jsonify({
                        "success": False,
                        "error": "Image processing completed but failed to serialize results"
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "error": result.get("error", "Image processing failed")
                }), 500
        except Exception as e:
            print(f"Image processing exception: {e}")
            return jsonify({
                "success": False,
                "error": f"Image processing failed: {str(e)}"
            }), 500
    
    except Exception as e:
        print(f"Image processing error: {e}")
        return jsonify({"error": f"Image processing failed: {str(e)}"}), 500

@app.route("/ask-image", methods=["POST"])
def ask_about_image():
    """Handles questions about uploaded image content."""
    global session_manager, default_session_id
    
    try:
        data = request.json if request.json else {}
        user_query = data.get("query")
        image_analysis = data.get("image_analysis")
        web_search_results = data.get("web_search_results")  # New: web search results from frontend
        # Optional session id to keep conversations separated per image
        session_id = data.get("session_id") or default_session_id
        
        if not user_query:
            return jsonify({"error": "No question provided"}), 400
        
        if not image_analysis:
            return jsonify({"error": "No image analysis provided"}), 400
        
        # Create context from AI analysis
        metadata = image_analysis.get('metadata', {})
        ai_analysis = image_analysis.get('ai_analysis', {})
        
        # Get basic metadata
        resolution = metadata.get('resolution', 'Unknown')
        file_size = metadata.get('file_size_mb', 'Unknown')
        aspect_ratio = metadata.get('aspect_ratio', 'Unknown')
        image_type = metadata.get('image_type', 'Unknown')
        
        # Get AI analysis results
        overall_description = ai_analysis.get('overall_description', 'No AI description available')
        main_subjects = ai_analysis.get('main_subjects', [])
        scene_type = ai_analysis.get('scene_type', 'Unknown')
        colors_and_lighting = ai_analysis.get('colors_and_lighting', 'Unknown')
        text_content = ai_analysis.get('text_content', 'No text detected')
        emotions_or_mood = ai_analysis.get('emotions_or_mood', 'Unknown')
        context_or_setting = ai_analysis.get('context_or_setting', 'Unknown')
        notable_details = ai_analysis.get('notable_details', [])
        educational_value = ai_analysis.get('educational_value', 'Unknown')
        suggested_topics = ai_analysis.get('suggested_topics', [])
        has_ai_analysis = ai_analysis.get('has_ai_analysis', False)
        
        if has_ai_analysis:
            image_context = f"""
            AI Image Analysis:
            - Overall Description: {overall_description}
            - Main Subjects: {', '.join(main_subjects) if main_subjects else 'None identified'}
            - Scene Type: {scene_type}
            - Colors and Lighting: {colors_and_lighting}
            - Text Content: {text_content}
            - Emotions/Mood: {emotions_or_mood}
            - Context/Setting: {context_or_setting}
            - Notable Details: {', '.join(notable_details) if notable_details else 'None specified'}
            - Educational Value: {educational_value}
            - Suggested Topics: {', '.join(suggested_topics) if suggested_topics else 'None suggested'}
            
            Technical Details:
            - Resolution: {resolution}
            - File Size: {file_size}MB
            - Aspect Ratio: {aspect_ratio}:1
            - Image Type: {image_type}
            """
        else:
            # Fallback to basic metadata if AI analysis failed
            error_msg = ai_analysis.get('error', 'AI analysis unavailable')
            image_context = f"""
            Basic Image Information:
            - Resolution: {resolution}
            - File Size: {file_size}MB
            - Aspect Ratio: {aspect_ratio}:1
            - Image Type: {image_type}
            - AI Analysis Status: {error_msg}
            """
        
        # Create full context including web search results if available
        full_context = image_context
        if web_search_results and web_search_results.get("results"):
            web_content = "\n\nAdditional Web Information:\n"
            if web_search_results.get("answer"):
                web_content += f"AI Summary: {web_search_results['answer']}\n\n"
            
            for i, result in enumerate(web_search_results["results"][:3], 1):  # Use top 3 results for images
                web_content += f"{i}. {result.get('title', 'No title')}\n"
                web_content += f"   Description: {result.get('snippet', result.get('content', 'No description'))[:150]}...\n\n"
            
            full_context += web_content
        
        # Generate response using image context + web context
        try:
            response = generate_response_without_retrieval(
                session_id,
                f"Based on this image analysis: {full_context}\n\nUser question: {user_query}",
                "",
                session_manager
            )
        except Exception as e:
            print(f"Error generating image response: {e}")
            # Fallback response if AI generation fails
            if has_ai_analysis:
                response = f"I can see you're asking about an image. Here's what I can tell you from the analysis:\n\n{overall_description}\n\nHowever, I encountered an error while processing your specific question. Could you please rephrase your question about the image content?"
            else:
                response = f"I can see you've uploaded an image with the following technical specifications:\n\n{image_context}\n\nHowever, detailed AI analysis is currently unavailable, and I encountered an error while processing your question. Could you please rephrase your question?"
        
        # Convert response to speech
        say(response)
        
        return jsonify({
            "response": response,
            "image_context": image_context,
            "hasImageAnalysis": True,
            "hasAIAnalysis": has_ai_analysis,
            "web_sources": web_search_results.get("results", []) if web_search_results else [],
            "hasWebSources": bool(web_search_results)
        })
    
    except Exception as e:
        print(f"Error processing image question: {e}")
        return jsonify({"error": f"Failed to process image question: {str(e)}"}), 500

    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5500, debug=True)