import os
import sys

# Ensure project root (backend/) is in the python path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.services.shopify import ShopifyStorefrontClient

def fetch_products():
    # Instantiate the modular client
    client = ShopifyStorefrontClient()

    # Fetch all products
    products = client.fetch_all_products()

    print(f"\nTotal Products: {len(products)}")
    return products

if __name__ == "__main__":
    fetch_products()