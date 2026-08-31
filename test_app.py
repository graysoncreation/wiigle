import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app, parse_results, safe_http_url


SAMPLE_HTML = """
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">Example Title</a>
  <a class="result__snippet">A useful <b>example</b> result.</a>
</div>
"""


def test_parse_results_unwraps_and_strips_markup():
    results = parse_results(SAMPLE_HTML)
    assert len(results) == 1
    assert results[0].url == "https://example.com/page"
    assert results[0].title == "Example Title"
    assert results[0].snippet == "A useful example result."


def test_unsafe_schemes_are_rejected():
    assert safe_http_url("javascript:alert(1)") is None
    assert safe_http_url("https://duckduckgo.com/l/?kh=-1") is None
    assert safe_http_url("https://example.com/") == "https://example.com/"


def test_home_is_html_without_javascript():
    app = create_app()
    client = app.test_client()
    response = client.get("/")
    body = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "HTML 4.01 Transitional" in body
    assert "<script" not in body.lower()
    assert "Wiigle Search" in body