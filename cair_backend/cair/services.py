"""
AI service integration for the cAir concierge system.
Provides OpenAI integration with specialized prompts for different story types.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Custom exception for AI service errors."""
    pass


class AIService:
    """
    Service class for integrating with OpenAI API.
    Handles conversation context, specialized prompts, and response parsing.
    """
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.base_url = os.getenv('AI_API_BASE_URL', 'https://api.openai.com/v1')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        self.timeout = int(os.getenv('AI_REQUEST_TIMEOUT', '30'))
        
        if not self.api_key:
            logger.warning("OpenAI API key not found in environment variables")
    
    def get_system_prompt(self, story_type: str) -> str:
        """
        Get specialized system prompt based on story type.
        
        Args:
            story_type: The type of story ('travel', 'wedding', etc.)
            
        Returns:
            Specialized system prompt string
        """
        prompts = {
            'travel': """You are a professional travel concierge assistant. Your role is to help users plan amazing trips by providing personalized recommendations, practical advice, and detailed planning assistance.

Key responsibilities:
- Provide destination recommendations based on user preferences, budget, and travel dates
- Suggest accommodations, activities, restaurants, and transportation options
- Help with itinerary planning and logistics
- Offer practical travel tips and cultural insights
- Create actionable travel planning tasks and checklists

When suggesting tasks or action items, format them clearly so they can be extracted as checklist items. Use phrases like "Task:" or "Action item:" or "You should:" to indicate actionable items.

Be friendly, knowledgeable, and detail-oriented. Ask clarifying questions when needed to provide the best recommendations.""",

            'wedding': """You are a professional wedding concierge assistant. Your role is to help couples plan their perfect wedding by providing expert guidance, vendor recommendations, and comprehensive planning support.

Key responsibilities:
- Help with venue selection and booking
- Provide vendor recommendations (photographers, caterers, florists, etc.)
- Assist with timeline and budget planning
- Offer advice on wedding traditions, etiquette, and trends
- Create detailed wedding planning checklists and timelines

When suggesting tasks or action items, format them clearly so they can be extracted as checklist items. Use phrases like "Task:" or "Action item:" or "You should:" to indicate actionable items.

Be supportive, organized, and detail-oriented. Remember that wedding planning can be stressful, so maintain a calm and encouraging tone while providing practical solutions."""
        }
        
        return prompts.get(story_type, prompts['travel'])  # Default to travel if type not found
    
    def format_conversation_history(self, messages: List[Dict]) -> List[Dict]:
        """
        Format conversation history for OpenAI API.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            
        Returns:
            Formatted messages for OpenAI API
        """
        formatted_messages = []
        
        for message in messages:
            role = message.get('role', 'user')
            content = message.get('content', '')
            
            # Map our roles to OpenAI roles
            if role == 'assistant':
                formatted_messages.append({
                    'role': 'assistant',
                    'content': content
                })
            else:  # user or any other role
                formatted_messages.append({
                    'role': 'user',
                    'content': content
                })
        
        return formatted_messages
    
    def extract_checklist_items(self, response_text: str) -> List[str]:
        """
        Extract actionable checklist items from AI response.
        
        Args:
            response_text: The AI response text
            
        Returns:
            List of extracted checklist items
        """
        checklist_items = []
        lines = response_text.split('\n')
        
        # Keywords that indicate actionable items
        action_keywords = [
            'task:', 'action item:', 'you should:', 'next step:', 'to do:',
            '- [ ]', '- task:', '- action:', 'step:', 'action:'
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if line contains action keywords
            line_lower = line.lower()
            for keyword in action_keywords:
                if keyword in line_lower:
                    # Clean up the line by removing the keyword and formatting
                    clean_item = line
                    for kw in action_keywords:
                        clean_item = clean_item.replace(kw.title(), '').replace(kw, '')
                    
                    clean_item = clean_item.strip('- ').strip()
                    if clean_item and len(clean_item) > 5:  # Minimum length check
                        checklist_items.append(clean_item[:200])  # Limit length
                    break
        
        return checklist_items
    
    def generate_response(
        self, 
        story_type: str, 
        conversation_history: List[Dict], 
        user_message: str,
        max_retries: int = 2
    ) -> Dict:
        """
        Generate AI response using OpenAI API.
        
        Args:
            story_type: Type of story ('travel', 'wedding', etc.)
            conversation_history: Previous messages in the conversation
            user_message: The new user message
            max_retries: Maximum number of retry attempts for transient errors
            
        Returns:
            Dictionary containing:
            - 'response': AI response text
            - 'suggested_checklist_items': List of extracted checklist items
            - 'success': Boolean indicating if request was successful
            - 'error': Error message if request failed
        """
        if not self.api_key:
            return {
                'response': "I'm sorry, but the AI service is not properly configured. Please check the API key configuration.",
                'suggested_checklist_items': [],
                'success': False,
                'error': 'Missing API key'
            }
        
        # Prepare messages for OpenAI API
        messages = [
            {'role': 'system', 'content': self.get_system_prompt(story_type)}
        ]
        
        # Add conversation history
        formatted_history = self.format_conversation_history(conversation_history)
        messages.extend(formatted_history)
        
        # Add current user message
        messages.append({'role': 'user', 'content': user_message})
        
        # Prepare API request
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': self.model,
            'messages': messages,
            'max_tokens': 1000,
            'temperature': 0.7,
            'top_p': 1.0,
            'frequency_penalty': 0.0,
            'presence_penalty': 0.0
        }
        
        # Retry logic for transient errors
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                # Make API request
                response = requests.post(
                    f'{self.base_url}/chat/completions',
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )
            
                if response.status_code == 200:
                    data = response.json()
                    ai_response = data['choices'][0]['message']['content']
                    
                    # Extract checklist items from response
                    checklist_items = self.extract_checklist_items(ai_response)
                    
                    logger.info(f"AI response generated successfully for story type: {story_type} (attempt {attempt + 1})")
                    
                    return {
                        'response': ai_response,
                        'suggested_checklist_items': checklist_items,
                        'success': True,
                        'error': None
                    }
                
                else:
                    error_msg = f"OpenAI API error: {response.status_code}"
                    error_type = 'api_error'
                    
                    try:
                        error_data = response.json()
                        api_error_message = error_data.get('error', {}).get('message', 'Unknown error')
                        error_msg += f" - {api_error_message}"
                        
                        # Detect specific error types
                        if response.status_code == 429:
                            error_type = 'rate_limit'
                        elif 'timeout' in api_error_message.lower():
                            error_type = 'timeout'
                    except:
                        pass
                    
                    # Check if this is a retryable error
                    retryable_codes = [429, 500, 502, 503, 504]
                    if response.status_code in retryable_codes and attempt < max_retries:
                        logger.warning(f"Retryable error {response.status_code}, attempt {attempt + 1}/{max_retries + 1}")
                        last_error = error_msg
                        import time
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    
                    logger.error(f"OpenAI API request failed: {error_msg}")
                    
                    error_response = self.get_error_response(error_type, story_type)
                    return {
                        'response': error_response['response'],
                        'suggested_checklist_items': error_response['suggested_checklist_items'],
                        'success': False,
                        'error': error_msg
                    }
        
            except requests.exceptions.Timeout as e:
                error_msg = "OpenAI API request timed out"
                if attempt < max_retries:
                    logger.warning(f"Timeout error, attempt {attempt + 1}/{max_retries + 1}")
                    last_error = error_msg
                    import time
                    time.sleep(2 ** attempt)
                    continue
                else:
                    logger.error(error_msg)
                    error_response = self.get_error_response('timeout', story_type)
                    return {
                        'response': error_response['response'],
                        'suggested_checklist_items': error_response['suggested_checklist_items'],
                        'success': False,
                        'error': error_msg
                    }
            
            except requests.exceptions.RequestException as e:
                error_msg = f"Network error: {str(e)}"
                if attempt < max_retries:
                    logger.warning(f"Network error, attempt {attempt + 1}/{max_retries + 1}: {str(e)}")
                    last_error = error_msg
                    import time
                    time.sleep(2 ** attempt)
                    continue
                else:
                    logger.error(f"OpenAI API request failed: {error_msg}")
                    error_response = self.get_error_response('network_error', story_type)
                    return {
                        'response': error_response['response'],
                        'suggested_checklist_items': error_response['suggested_checklist_items'],
                        'success': False,
                        'error': error_msg
                    }
            
            except Exception as e:
                logger.error(f"Unexpected error in AI service: {str(e)}")
                error_response = self.get_error_response('api_error', story_type)
                return {
                    'response': error_response['response'],
                    'suggested_checklist_items': error_response['suggested_checklist_items'],
                    'success': False,
                    'error': f'Unexpected error: {str(e)}'
                }
        
        # If we get here, all retries failed
        logger.error(f"All retry attempts failed. Last error: {last_error}")
        error_response = self.get_error_response('api_error', story_type)
        return {
            'response': error_response['response'],
            'suggested_checklist_items': error_response['suggested_checklist_items'],
            'success': False,
            'error': last_error or 'All retry attempts failed'
        }
    
    def _get_fallback_response(self, story_type: str) -> str:
        """
        Get fallback response when AI service is unavailable.
        
        Args:
            story_type: Type of story
            
        Returns:
            Fallback response text
        """
        fallback_responses = {
            'travel': """I apologize, but I'm currently experiencing technical difficulties connecting to my AI service. 
            
However, I'd be happy to help you with your travel planning once the connection is restored. In the meantime, here are some general travel planning steps you might consider:

Task: Research your destination's weather and best travel times
Task: Set a preliminary budget for your trip
Task: Look into visa or passport requirements
Task: Start researching accommodations in your preferred area
Task: Check for any travel advisories or health requirements
Task: Consider travel insurance options

Please try sending your message again in a few moments, and I'll be able to provide more personalized assistance!""",
            
            'wedding': """I apologize, but I'm currently experiencing technical difficulties connecting to my AI service.
            
However, I'd be happy to help you with your wedding planning once the connection is restored. In the meantime, here are some essential wedding planning steps to consider:

Task: Set your wedding date and create a timeline
Task: Determine your budget and allocate funds to different categories
Task: Create your guest list and send save-the-dates
Task: Start researching and booking your venue
Task: Begin looking for a photographer and videographer
Task: Research catering options and schedule tastings

Please try sending your message again in a few moments, and I'll be able to provide more personalized wedding planning assistance!"""
        }
        
        return fallback_responses.get(story_type, fallback_responses['travel'])
    
    def get_error_response(self, error_type: str, story_type: str) -> Dict:
        """
        Get appropriate error response based on error type.
        
        Args:
            error_type: Type of error ('timeout', 'api_error', 'network_error', etc.)
            story_type: Type of story
            
        Returns:
            Error response dictionary
        """
        error_responses = {
            'timeout': {
                'response': f"I'm taking a bit longer than usual to respond. Let me provide you with some immediate {story_type} planning suggestions while I work on getting back to full capacity.",
                'suggested_checklist_items': self._get_emergency_checklist_items(story_type)
            },
            'api_error': {
                'response': f"I'm experiencing some technical difficulties, but I can still help with your {story_type} planning using my backup knowledge.",
                'suggested_checklist_items': self._get_emergency_checklist_items(story_type)
            },
            'network_error': {
                'response': "I'm having trouble connecting to my knowledge base, but I can provide some basic planning steps to get you started.",
                'suggested_checklist_items': self._get_emergency_checklist_items(story_type)
            },
            'rate_limit': {
                'response': "I'm currently handling a lot of requests. Please wait a moment and try again, or I can provide some general planning steps in the meantime.",
                'suggested_checklist_items': []
            }
        }
        
        return error_responses.get(error_type, error_responses['api_error'])
    
    def _get_emergency_checklist_items(self, story_type: str) -> List[str]:
        """
        Get emergency checklist items when AI service is unavailable.
        
        Args:
            story_type: Type of story
            
        Returns:
            List of basic checklist items
        """
        emergency_items = {
            'travel': [
                "Research destination and create basic itinerary",
                "Check passport and visa requirements",
                "Set travel budget and track expenses",
                "Book flights and accommodations",
                "Research local customs and language basics"
            ],
            'wedding': [
                "Set wedding date and book venue",
                "Create guest list and send invitations",
                "Set wedding budget and track expenses",
                "Book photographer and videographer",
                "Research and book catering services"
            ]
        }
        
        return emergency_items.get(story_type, emergency_items['travel'])
    
    def validate_api_configuration(self) -> Tuple[bool, str]:
        """
        Validate that the AI service is properly configured.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.api_key:
            return False, "OpenAI API key is not configured"
        
        if not self.base_url:
            return False, "AI API base URL is not configured"
        
        # Test API connectivity with a simple request
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Simple test request to validate API key
            response = requests.get(
                f'{self.base_url}/models',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "AI service configuration is valid"
            else:
                return False, f"API validation failed with status {response.status_code}"
        
        except Exception as e:
            return False, f"API validation error: {str(e)}"
    
    def health_check(self) -> Dict:
        """
        Perform a comprehensive health check of the AI service.
        
        Returns:
            Dictionary with health check results
        """
        health_status = {
            'service_name': 'AI Service',
            'timestamp': str(datetime.now()),
            'status': 'healthy',
            'checks': {}
        }
        
        # Check API key configuration
        if self.api_key:
            health_status['checks']['api_key'] = {'status': 'ok', 'message': 'API key configured'}
        else:
            health_status['checks']['api_key'] = {'status': 'warning', 'message': 'API key not configured'}
            health_status['status'] = 'degraded'
        
        # Check base URL configuration
        if self.base_url:
            health_status['checks']['base_url'] = {'status': 'ok', 'message': f'Base URL: {self.base_url}'}
        else:
            health_status['checks']['base_url'] = {'status': 'error', 'message': 'Base URL not configured'}
            health_status['status'] = 'unhealthy'
        
        # Test API connectivity if API key is available
        if self.api_key:
            try:
                is_valid, message = self.validate_api_configuration()
                if is_valid:
                    health_status['checks']['api_connectivity'] = {'status': 'ok', 'message': 'API accessible'}
                else:
                    health_status['checks']['api_connectivity'] = {'status': 'error', 'message': message}
                    health_status['status'] = 'unhealthy'
            except Exception as e:
                health_status['checks']['api_connectivity'] = {'status': 'error', 'message': f'Connectivity test failed: {str(e)}'}
                health_status['status'] = 'unhealthy'
        else:
            health_status['checks']['api_connectivity'] = {'status': 'skipped', 'message': 'No API key to test connectivity'}
        
        # Check model configuration
        health_status['checks']['model'] = {'status': 'ok', 'message': f'Model: {self.model}'}
        
        # Check timeout configuration
        health_status['checks']['timeout'] = {'status': 'ok', 'message': f'Timeout: {self.timeout}s'}
        
        return health_status


# Global AI service instance
ai_service = AIService()