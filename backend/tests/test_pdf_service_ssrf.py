from backend.services.pdf_service import _is_safe_external_url


def test_rejects_localhost_and_private_ips():
    assert _is_safe_external_url("http://localhost/secret") is False
    assert _is_safe_external_url("http://127.0.0.1/secret") is False
    assert _is_safe_external_url("http://169.254.169.254/latest/meta-data/") is False
    assert _is_safe_external_url("http://10.0.0.5/internal") is False
    assert _is_safe_external_url("http://192.168.1.1/") is False


def test_rejects_non_http_schemes():
    assert _is_safe_external_url("file:///etc/passwd") is False
    assert _is_safe_external_url("ftp://example.com/x.jpg") is False


def test_accepts_public_https_url():
    assert _is_safe_external_url("https://images.unsplash.com/photo-123") is True
