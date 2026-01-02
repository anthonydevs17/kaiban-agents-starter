import os
import time
import requests
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()


class KaibanClient:
    """HTTP client for the Kaiban API (equivalent to @kaiban/sdk)"""
    
    def __init__(
        self,
        tenant: str,
        token: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        self.tenant = tenant
        self.token = token or os.getenv("KAIBAN_SHARED_TOKEN")
        self.base_url = base_url or os.getenv(
            "KAIBAN_API_URL", 
            f"https://{tenant}.kaiban.io/api"
        ).replace("{tenant}", tenant)
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "x-tenant": tenant,
            "Content-Type": "application/json"
        }
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        max_retries: int = 3,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """Makes an HTTP request to the Kaiban API with retry logic"""
        # Ensure endpoint starts with /v1 or add it
        if not endpoint.startswith("/v1") and not endpoint.startswith("v1"):
            endpoint = f"/v1/{endpoint.lstrip('/')}"
        
        url = f"{self.base_url}{endpoint}"
        
        last_exception = None
        for attempt in range(1, max_retries + 1):
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    params=params,
                    timeout=timeout
                )
                
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                last_exception = e
                if attempt < max_retries:
                    wait_time = attempt * 2  # Exponential backoff: 2s, 4s, 6s
                    print(f"Request failed (attempt {attempt}/{max_retries}): {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"Request failed after {max_retries} attempts: {e}")
                    raise
            except requests.exceptions.HTTPError as e:
                # Don't retry on HTTP errors (4xx, 5xx) except 5xx server errors
                if e.response and e.response.status_code >= 500 and attempt < max_retries:
                    wait_time = attempt * 2
                    print(f"Server error {e.response.status_code} (attempt {attempt}/{max_retries}). Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    last_exception = e
                    continue
                raise
        
        # If we exhausted all retries, raise the last exception
        if last_exception:
            raise last_exception
    
    # Cards API
    def get_card(self, card_id: str) -> Dict[str, Any]:
        """Gets a card by ID"""
        return self._request("GET", f"card/{card_id}")
    
    def update_card(self, card_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates a card"""
        return self._request("PUT", f"card/{card_id}", data=data)
    
    def create_batch_activities(
        self,
        card_id: str,
        activities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Creates multiple activities in batch (following @kaiban/sdk pattern)"""
        # Add card_id to each activity (required by API schema)
        activities_with_card_id = [
            {**activity, "card_id": card_id}
            for activity in activities
        ]
        
        return self._request(
            "POST",
            "activities:batch",
            data={
                "items": activities_with_card_id
            }
        )
    
    # Boards API
    def get_board(self, board_id: str) -> Dict[str, Any]:
        """Gets a board by ID"""
        return self._request("GET", f"board/{board_id}")
    
    # Agents API
    def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """Gets an agent by ID"""
        return self._request("GET", f"agent/{agent_id}")

