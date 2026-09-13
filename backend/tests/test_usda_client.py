from unittest.mock import patch

import pytest

from backend.services import usda_client


def test_search_food_without_api_key_raises_instead_of_returning_none():
    """A missing USDA_FDC_API_KEY must not look identical to "USDA has no
    match" — otherwise callers (micronutrient_service.get_or_fetch) cache it
    as a permanent non-match, and an ingredient looked up before the key was
    configured stays incorrectly blacklisted forever, even after the key is
    added later."""
    with patch.object(usda_client, "get_api_key", return_value=""):
        with pytest.raises(usda_client.USDALookupError):
            usda_client.search_food("avocado")


def test_search_food_with_empty_query_returns_none_even_without_api_key():
    with patch.object(usda_client, "get_api_key", return_value=""):
        assert usda_client.search_food("   ") is None
