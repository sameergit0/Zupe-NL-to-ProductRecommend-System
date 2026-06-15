import requests
import json
import time
from typing import Dict, Any, List, Optional
from app.core.config import SHOPIFY_ENDPOINT, SHOPIFY_STOREFRONT_ACCESS_TOKEN
from app.graphql.queries import GET_ALL_PRODUCTS_QUERY

class ShopifyStorefrontClient:
    def __init__(
        self,
        endpoint: str = SHOPIFY_ENDPOINT,
        storefront_token: str = SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    ):
        self.endpoint = endpoint
        self.storefront_token = storefront_token
        self.headers = {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": self.storefront_token,
            "Authorization": "Basic Og=="  # preserved user header
        }

    def execute_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {
            "query": query,
            "variables": variables or {}
        }

        response = requests.post(
            self.endpoint,
            headers=self.headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()

        data = response.json()
        if "errors" in data:
            raise Exception(json.dumps(data["errors"], indent=2))

        return data

    def fetch_all_products(self, page_size: int = 50) -> List[Dict[str, Any]]:
        all_products = []
        cursor = None
        page = 1

        while True:
            data = self.execute_query(
                GET_ALL_PRODUCTS_QUERY,
                variables={
                    "first": page_size,
                    "after": cursor
                }
            )

            products = data["data"]["products"]
            page_products = products["nodes"]
            all_products.extend(page_products)

            if not products["pageInfo"]["hasNextPage"]:
                break

            cursor = products["pageInfo"]["endCursor"]
            page += 1
            time.sleep(0.3)

        return all_products
