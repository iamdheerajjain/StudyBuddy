"""
Simple video processor wrapper for Flask app integration.
This is a simplified interface to the main VideoProcessor class.
"""

from .video_processor import process_video

# Re-export the process_video function for Flask app compatibility
__all__ = ['process_video']