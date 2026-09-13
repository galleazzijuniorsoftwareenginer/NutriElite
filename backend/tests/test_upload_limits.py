import pytest

from backend.services.upload_limits import assert_base64_size_ok
from fastapi import HTTPException


def test_small_payload_passes():
    assert_base64_size_ok("aGVsbG8=", max_mb=5, field_name="El logo")


def test_empty_payload_passes():
    assert_base64_size_ok("", max_mb=5, field_name="El logo")


def test_oversized_payload_raises_413():
    # ~7MB of base64 text, over a 5MB (decoded) cap.
    oversized = "a" * (7 * 1024 * 1024)
    with pytest.raises(HTTPException) as exc:
        assert_base64_size_ok(oversized, max_mb=5, field_name="El logo")
    assert exc.value.status_code == 413


def test_data_url_prefix_is_excluded_from_size_check():
    small = "data:image/png;base64," + "a" * 100
    assert_base64_size_ok(small, max_mb=5, field_name="El logo")
