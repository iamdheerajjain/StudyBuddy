import pyttsx3
import multiprocessing
import time
from typing import List

# Global variable to store speech process
speech_process = None

def _chunk_text(text: str, max_chars: int = 240) -> List[str]:
    """Split text into natural chunks that TTS can speak clearly."""
    if not text:
        return []
    separators = ['. ', '! ', '? ', '; ', ': ', ', ', '\n']
    chunks: List[str] = []
    current = ''
    i = 0
    while i < len(text):
        current += text[i]
        end_here = False
        # Decide if we should break here based on separators or length
        if any(current.endswith(sep) for sep in separators):
            end_here = len(current) >= max_chars * 0.6  # break on sentence end past a threshold
        if len(current) >= max_chars:
            end_here = True
        if end_here:
            chunks.append(current.strip())
            current = ''
        i += 1
    if current.strip():
        chunks.append(current.strip())
    return chunks


def speak_text(text):
    engine = pyttsx3.init()
    # Use the Microsoft Speech API for more voices (Windows)
    voices = engine.getProperty('voices')
    # Pick a reasonable default voice safely
    try:
        # Prefer a female/en-US style voice if available
        preferred = next((v for v in voices if 'female' in v.name.lower() or 'zira' in v.name.lower() or 'en-us' in v.id.lower()), None)
        engine.setProperty('voice', (preferred or voices[0]).id)
    except Exception:
        # Fallback to first available without crashing
        try:
            engine.setProperty('voice', voices[0].id)
        except Exception:
            pass
    # Set the speech rate (default is usually ~200 words per minute)
    rate = engine.getProperty('rate')  # Get the current rate
    engine.setProperty('rate', rate - 25)  # Decrease the rate for slower speech
    # Speak in manageable chunks for clarity and reliability
    for segment in _chunk_text(text):
        engine.say(segment)
        engine.runAndWait()

def say(text):
    global speech_process
    stop_speech()  # Stop any ongoing speech before starting new one
    speech_process = multiprocessing.Process(target=speak_text, args=(text,))
    speech_process.start()

def stop_speech():
    global speech_process
    if speech_process and speech_process.is_alive():
        speech_process.terminate()
        speech_process.join()
        speech_process = None
        return True  # Indicate success
    return False  # No speech was running


# Example Usage
if __name__ == "__main__":
    say("Hello, this is a text to speech test.")
    time.sleep(2)  # Allow some speech to play
    stop_speech()  # Stop speech midway