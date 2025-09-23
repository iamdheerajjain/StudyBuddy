"""
Enhanced Web Scraping Module with Tavily AI Integration
Provides artifact-style search results with citations and source attribution
"""

import os
import logging
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Data class for search results with metadata"""
    title: str
    url: str
    content: str
    snippet: str
    score: float
    published_date: Optional[str] = None
    domain: str = ""
    favicon: str = ""
    
    def __post_init__(self):
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(self.url)
            self.domain = parsed.netloc
        except:
            self.domain = "unknown"

@dataclass
class VideoResult:
    """Data class for video search results"""
    title: str
    url: str
    thumbnail: str
    duration: str
    channel: str
    views: str
    published: str
    description: str = ""

@dataclass 
class SearchResponse:
    """Container for search results with metadata"""
    query: str
    results: List[SearchResult] = field(default_factory=list)
    answer: str = ""
    total_results: int = 0
    search_time_ms: float = 0
    search_engine: str = "tavily"
    images: List[Dict] = field(default_factory=list)
    videos: List[VideoResult] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "query": self.query,
            "answer": self.answer,
            "total_results": self.total_results,
            "search_time_ms": self.search_time_ms,
            "search_engine": self.search_engine,
            "results": [
                {
                    "title": r.title,
                    "url": r.url,
                    "content": r.content,
                    "snippet": r.snippet,
                    "score": r.score,
                    "domain": r.domain,
                    "published_date": r.published_date
                } for r in self.results
            ],
            "images": self.images,
            "videos": [
                {
                    "title": v.title,
                    "url": v.url,
                    "thumbnail": v.thumbnail,
                    "duration": v.duration,
                    "channel": v.channel,
                    "views": v.views,
                    "published": v.published,
                    "description": v.description
                } for v in self.videos
            ]
        }

class YouTubeSearchEngine:
    """YouTube search integration for educational videos with multiple search methods"""
    
    def search_youtube(self, query: str, max_results: int = 3) -> List[VideoResult]:
        """Search for educational YouTube videos using multiple methods"""
        # Try youtube-search-python first
        videos = self._search_with_youtube_python(query, max_results)
        
        # If that fails, try SerpAPI
        if not videos:
            videos = self._search_with_serpapi(query, max_results)
        
        # If still no results, try direct API approach
        if not videos:
            videos = self._search_with_direct_api(query, max_results)
            
        return videos
    
    def _search_with_youtube_python(self, query: str, max_results: int) -> List[VideoResult]:
        """Search using youtube-search-python library with timeout and error handling"""
        try:
            from youtubesearchpython import VideosSearch
            
            # Create educational search query
            educational_terms = ['tutorial', 'lesson', 'explanation', 'how to', 'guide', 'learn']
            enhanced_query = f"{query} {educational_terms[0]}"
            
            # Simple search with timeout protection
            videos = []
            try:
                videosSearch = VideosSearch(enhanced_query, limit=max_results)
                results = videosSearch.result()
                
                # Simple result processing
                if results and 'result' in results:
                    for i, video in enumerate(results['result']):
                        if i >= max_results:
                            break
                        try:
                            video_result = VideoResult(
                                title=str(video.get('title', 'Educational Video')),
                                url=str(video.get('link', '')),
                                thumbnail=str(video.get('thumbnails', [{}])[0].get('url', '') if video.get('thumbnails') else ''),
                                duration=str(video.get('duration', 'Unknown')),
                                channel=str(video.get('channel', {}).get('name', 'Unknown Channel') if video.get('channel') else 'Unknown'),
                                views=str(video.get('viewCount', {}).get('text', 'Unknown') if video.get('viewCount') else 'Unknown'),
                                published=str(video.get('publishedTime', 'Unknown')),
                                description=str(video.get('descriptionSnippet', [{}])[0].get('text', '') if video.get('descriptionSnippet') else '')
                            )
                            videos.append(video_result)
                        except Exception as e:
                            logger.debug(f"Error processing video {i}: {e}")
                            continue
                            
            except Exception as e:
                logger.warning(f"YouTube-search-python failed: {e}")
                return []
            
            logger.info(f"Found {len(videos)} videos using youtube-search-python")
            return videos
            
        except ImportError:
            logger.warning("youtube-search-python not available")
            return []
        except Exception as e:
            logger.error(f"YouTube search failed: {e}")
            return []
    
    def _search_with_serpapi(self, query: str, max_results: int) -> List[VideoResult]:
        """Search YouTube using SerpAPI Google search"""
        try:
            serp_api_key = os.getenv("SERP_API_KEY")
            if not serp_api_key:
                return []
            
            from serpapi import GoogleSearch
            
            # Search YouTube specifically for educational content
            educational_query = f"{query} tutorial lesson explanation site:youtube.com"
            
            params = {
                "engine": "google",
                "q": educational_query,
                "num": max_results * 2,  # Get more to filter
                "api_key": serp_api_key
            }
            
            search = GoogleSearch(params)
            results = search.get_dict()
            
            videos = []
            for result in results.get("organic_results", []):
                link = result.get("link", "")
                if "youtube.com/watch" in link:
                    video = VideoResult(
                        title=result.get("title", ""),
                        url=link,
                        thumbnail=self._extract_youtube_thumbnail(link),
                        duration="Unknown",
                        channel=self._extract_channel(result.get("displayed_link", "")),
                        views="Unknown",
                        published="Unknown",
                        description=result.get("snippet", "")
                    )
                    videos.append(video)
                    
                    if len(videos) >= max_results:
                        break
            
            logger.info(f"Found {len(videos)} videos using SerpAPI")
            return videos
            
        except Exception as e:
            logger.error(f"YouTube search with SerpAPI failed: {str(e)}")
            return []
    
    def _search_with_direct_api(self, query: str, max_results: int) -> List[VideoResult]:
        """Search using direct HTTP requests to YouTube (as fallback)"""
        try:
            # This is a simple fallback that creates placeholder results
            educational_keywords = ['tutorial', 'lesson', 'explanation', 'guide', 'how to']
            
            videos = []
            for i, keyword in enumerate(educational_keywords[:max_results]):
                video = VideoResult(
                    title=f"{query} - {keyword.title()}",
                    url=f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}+{keyword.replace(' ', '+')}",
                    thumbnail="https://img.youtube.com/vi/default/hqdefault.jpg",
                    duration="Search Required",
                    channel="YouTube Search",
                    views="Search on YouTube",
                    published="Recent",
                    description=f"Search YouTube for {query} {keyword} to find educational content"
                )
                videos.append(video)
            
            logger.info(f"Created {len(videos)} search links as fallback")
            return videos
            
        except Exception as e:
            logger.error(f"Direct API search failed: {e}")
            return []
    
    def _extract_youtube_thumbnail(self, url: str) -> str:
        """Extract YouTube thumbnail URL"""
        try:
            import re
            video_id_match = re.search(r'v=([^&]+)', url)
            if video_id_match:
                video_id = video_id_match.group(1)
                return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        except:
            pass
        return "https://img.youtube.com/vi/default/hqdefault.jpg"
    
    def _extract_channel(self, displayed_link: str) -> str:
        """Extract channel name from displayed link"""
        try:
            if "youtube.com" in displayed_link:
                parts = displayed_link.split(" › ")
                if len(parts) > 1:
                    return parts[1]
        except:
            pass
        return "Unknown Channel"

class TavilySearchEngine:
    """Tavily AI search engine integration with timeout handling"""
    
    def __init__(self):
        # Check both possible environment variable names
        self.api_key = os.getenv("TAVILY_API_KEY") or os.getenv("Tavily_API_KEY")
        self.base_url = "https://api.tavily.com"
        self.timeout = 15  # 15 second timeout
        
        if not self.api_key:
            logger.warning("Neither TAVILY_API_KEY nor Tavily_API_KEY found. Tavily search will not be available.")
        else:
            logger.info(f"Tavily API key found: {self.api_key[:10]}...")
    
    def search(self, query: str, max_results: int = 5, include_answer: bool = True, 
               include_raw_content: bool = True, search_depth: str = "advanced") -> SearchResponse:
        """
        Search using Tavily AI API with proper timeout handling
        """
        if not self.api_key:
            raise ValueError("Tavily API key not configured")
        
        start_time = datetime.now()
        
        try:
            # Use Tavily Python SDK with timeout
            from tavily import TavilyClient
            
            client = TavilyClient(api_key=self.api_key)
            
            # Set timeout for the request
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("Tavily search timed out")
            
            # For Windows, use threading timeout instead of signal
            import threading
            result = {}
            exception = None
            
            def search_worker():
                nonlocal result, exception
                try:
                    result = client.search(
                        query=query,
                        search_depth="advanced" if search_depth == "advanced" else "basic",
                        include_answer=include_answer,
                        include_raw_content=include_raw_content,
                        max_results=max_results,
                        include_images=True
                    )
                except Exception as e:
                    exception = e
            
            search_thread = threading.Thread(target=search_worker)
            search_thread.start()
            search_thread.join(timeout=self.timeout)
            
            if search_thread.is_alive():
                logger.warning(f"Tavily search timed out after {self.timeout} seconds")
                raise TimeoutError("Tavily search timed out")
            
            if exception:
                raise exception
            
            if not result:
                raise ValueError("No response from Tavily")
            
            search_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Parse results
            results = []
            for item in result.get("results", []):
                search_result = SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    content=item.get("raw_content", item.get("content", "")),
                    snippet=item.get("content", ""),
                    score=item.get("score", 0.0),
                    published_date=item.get("published_date")
                )
                results.append(search_result)
            
            return SearchResponse(
                query=query,
                results=results,
                answer=result.get("answer", ""),
                total_results=len(results),
                search_time_ms=search_time,
                images=result.get("images", [])
            )
            
        except (TimeoutError, Exception) as e:
            search_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"Tavily search failed after {search_time:.0f}ms: {str(e)}")
            return SearchResponse(query=query, search_time_ms=search_time)

class FallbackSearchEngine:
    """Fallback search engine using SerpAPI and BeautifulSoup"""
    
    def __init__(self):
        self.api_key = os.getenv("SERP_API_KEY")
        # Use built-in scraper
        self.scrape_url = self._builtin_scraper
    
    def _builtin_scraper(self, url: str) -> str:
        """Built-in web scraper using requests and BeautifulSoup"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract main content
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Try to find main content areas
            content_selectors = [
                'main', 'article', '.content', '#content', 
                '.main-content', '.post-content', '.entry-content'
            ]
            
            content = ""
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text()
                    break
            
            # Fallback to body if no specific content area found
            if not content:
                content = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in content.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            content = ' '.join(chunk for chunk in chunks if chunk)
            
            return content[:5000]  # Limit content length
            
        except Exception as e:
            logger.error(f"Built-in scraper failed for {url}: {e}")
            return f"Failed to scrape content from {url}"
    
    def search(self, query: str, max_results: int = 5) -> SearchResponse:
        """Fallback search using SerpAPI with built-in scraping"""
        try:
            if not self.api_key:
                return SearchResponse(query=query)
            
            start_time = datetime.now()
            
            # Use SerpAPI for Google search
            try:
                from serpapi import GoogleSearch
                
                params = {
                    "engine": "google",
                    "q": query,
                    "num": max_results,
                    "api_key": self.api_key
                }
                
                search = GoogleSearch(params)
                results = search.get_dict()
                organic_results = results.get("organic_results", [])
                
                search_results = []
                for result in organic_results:
                    url = result.get("link", "")
                    title = result.get("title", "")
                    snippet = result.get("snippet", "")
                    
                    # Scrape content if possible
                    content = self.scrape_url(url) if url else snippet
                    
                    search_result = SearchResult(
                        title=title,
                        url=url,
                        content=content,
                        snippet=snippet,
                        score=0.8 - (len(search_results) * 0.1)  # Descending score
                    )
                    search_results.append(search_result)
                
                search_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return SearchResponse(
                    query=query,
                    results=search_results,
                    total_results=len(search_results),
                    search_time_ms=search_time,
                    search_engine="serpapi_fallback"
                )
                
            except ImportError:
                logger.error("SerpAPI not available")
                return SearchResponse(query=query, search_time_ms=0)
            
        except Exception as e:
            logger.error(f"Fallback search failed: {str(e)}")
            return SearchResponse(query=query, search_time_ms=0)

class EnhancedWebSearcher:
    """Enhanced web searcher with intelligent timeout handling and engine switching"""
    
    def __init__(self):
        self.tavily = TavilySearchEngine()
        self.fallback = FallbackSearchEngine()
        self.youtube = YouTubeSearchEngine()
        self.use_tavily = bool(os.getenv("TAVILY_API_KEY") or os.getenv("Tavily_API_KEY"))
        self.last_engine_used = None
        self.engine_failure_count = {"tavily": 0, "fallback": 0}
        
        logger.info(f"Enhanced Web Searcher initialized. Tavily: {'✓' if self.use_tavily else '✗'}")
    
    def search(self, query: str, max_results: int = 5, search_type: str = "comprehensive") -> SearchResponse:
        """
        Search with intelligent engine selection and timeout handling
        """
        # Adjust query based on search type
        if search_type == "educational":
            enhanced_query = f"{query} tutorial guide explanation example learn"
        elif search_type == "comprehensive": 
            enhanced_query = f"{query} complete guide documentation overview"
        else:
            enhanced_query = query
        
        # Intelligent engine selection based on recent failures
        engines_to_try = []
        
        if self.use_tavily and self.engine_failure_count["tavily"] < 3:
            engines_to_try.append(("tavily", self.tavily))
        
        if self.engine_failure_count["fallback"] < 3:
            engines_to_try.append(("fallback", self.fallback))
        
        # If both engines have failed recently, reset counters and try again
        if not engines_to_try:
            logger.warning("All engines failed recently, resetting failure counts")
            self.engine_failure_count = {"tavily": 0, "fallback": 0}
            if self.use_tavily:
                engines_to_try.append(("tavily", self.tavily))
            engines_to_try.append(("fallback", self.fallback))
        
        response = None
        last_error = None
        
        for engine_name, engine in engines_to_try:
            try:
                logger.info(f"Trying {engine_name} search for: {enhanced_query}")
                
                if engine_name == "tavily":
                    response = engine.search(
                        enhanced_query, 
                        max_results=max_results,
                        search_depth="advanced" if search_type == "comprehensive" else "basic"
                    )
                else:
                    response = engine.search(query, max_results)
                
                if response and response.results:
                    logger.info(f"✅ {engine_name} returned {len(response.results)} results")
                    self.last_engine_used = engine_name
                    self.engine_failure_count[engine_name] = 0  # Reset failure count on success
                    break
                else:
                    logger.warning(f"❌ {engine_name} returned no results")
                    self.engine_failure_count[engine_name] += 1
                    
            except Exception as e:
                logger.error(f"❌ {engine_name} search failed: {str(e)}")
                self.engine_failure_count[engine_name] += 1
                last_error = e
                continue
        
        # If no engine worked, return empty response with error info
        if not response or not response.results:
            logger.error("All search engines failed")
            response = SearchResponse(
                query=query, 
                search_time_ms=0,
                search_engine="failed"
            )
            if last_error:
                response.answer = f"Search temporarily unavailable: {str(last_error)}"
        
        # Add YouTube videos for educational content (with timeout protection)
        if search_type == "educational" and response:
            try:
                logger.info("Adding YouTube educational videos...")
                videos = self.youtube.search_youtube(query, max_results=3)
                response.videos = videos
                logger.info(f"Added {len(videos)} YouTube videos")
            except Exception as e:
                logger.error(f"YouTube search failed: {e}")
                response.videos = []
        
        # Extract and enhance images if available (simplified)
        if response and not response.images:
            try:
                response.images = self._extract_educational_images(query, response.results)
            except Exception as e:
                logger.debug(f"Image extraction failed: {e}")
                response.images = []
            
        return response
    
    def _extract_educational_images(self, query: str, results: List[SearchResult]) -> List[Dict]:
        """Extract educational images from search results - simplified version"""
        # For now, return empty list to avoid BeautifulSoup type issues
        # This can be enhanced later with proper type annotations
        return []
    
    def get_content_for_llm(self, response: SearchResponse, max_chars: int = 4000) -> str:
        """
        Extract and format content for LLM consumption
        
        Args:
            response: Search response
            max_chars: Maximum characters to return
        """
        if not response.results:
            return "No search results found."
        
        # Start with AI answer if available
        content_parts = []
        
        if response.answer:
            content_parts.append(f"AI Summary: {response.answer}")
        
        # Add source content with citations
        for i, result in enumerate(response.results[:3], 1):  # Limit to top 3 results
            citation = f"[{i}] {result.title} ({result.domain})"
            source_content = result.content[:800] if result.content else result.snippet
            content_parts.append(f"\\n{citation}:\\n{source_content}")
        
        # Combine and truncate if necessary
        full_content = "\\n\\n".join(content_parts)
        
        if len(full_content) > max_chars:
            full_content = full_content[:max_chars] + "\\n\\n[Content truncated for brevity]"
        
        # Add source URLs for reference
        source_urls = "\\n\\nSources:\\n" + "\\n".join([
            f"[{i}] {result.url}" for i, result in enumerate(response.results[:3], 1)
        ])
        
        return full_content + source_urls

# Global instance
enhanced_searcher = EnhancedWebSearcher()

def enhanced_web_search(query: str, search_type: str = "comprehensive") -> SearchResponse:
    """
    Main function for enhanced web search
    
    Args:
        query: Search query
        search_type: "quick", "comprehensive", or "educational"
    """
    return enhanced_searcher.search(query, max_results=5, search_type=search_type)

def get_search_content_for_ai(query: str, search_type: str = "educational") -> str:
    """
    Get search content formatted for AI consumption
    
    Args:
        query: Search query  
        search_type: Type of search to perform
    """
    response = enhanced_web_search(query, search_type)
    return enhanced_searcher.get_content_for_llm(response)


if __name__ == "__main__":
    # Test the enhanced search
    test_query = input("Enter search query: ")
    response = enhanced_web_search(test_query)
    
    print(f"\\n=== Search Results for: {test_query} ===")
    print(f"Found {response.total_results} results in {response.search_time_ms:.0f}ms")
    
    if response.answer:
        print(f"\\nAI Answer: {response.answer}")
    
    for i, result in enumerate(response.results, 1):
        print(f"\\n[{i}] {result.title}")
        print(f"    URL: {result.url}")
        print(f"    Score: {result.score:.2f}")
        print(f"    Snippet: {result.snippet[:100]}...")