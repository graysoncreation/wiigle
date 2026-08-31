"""Wiigle: a deliberately simple search front end for the Wii Internet Channel."""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import requests
from bs4 import BeautifulSoup
from flask import Flask, Response, render_template, request


DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/"
MAX_QUERY_LENGTH = 200
RESULTS_PER_PAGE = 10
REQUEST_TIMEOUT = (4, 12)


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    display_url: str
    snippet: str


class SearchError(RuntimeError):
    """Raised when the upstream search service cannot be used."""


def clean_text(value: str) -> str:
    return " ".join(value.split())


def unwrap_duckduckgo_url(href: str) -> str:
    """Return the destination URL from DuckDuckGo redirect links."""
    parsed = urlparse(href)
    query = parse_qs(parsed.query)
    if "uddg" in query and query["uddg"]:
        return unquote(query["uddg"][0])
    return href


def safe_http_url(href: str) -> str | None:
    """Allow only ordinary web links in result pages."""
    destination = unwrap_duckduckgo_url(href)
    parsed = urlparse(destination)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    hostname = (parsed.hostname or "").lower()
    if hostname == "duckduckgo.com" or hostname.endswith(".duckduckgo.com"):
        return None
    return destination


def parse_results(html: str) -> list[SearchResult]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[SearchResult] = []

    for block in soup.select(".result"):
        link = block.select_one(".result__a")
        if link is None:
            continue

        url = safe_http_url(link.get("href", ""))
        title = clean_text(link.get_text(" ", strip=True))
        if not url or not title:
            continue

        snippet_node = block.select_one(".result__snippet")
        snippet = (
            clean_text(snippet_node.get_text(" ", strip=True))
            if snippet_node is not None
            else ""
        )
        parsed_url = urlparse(url)
        display_url = parsed_url.netloc + parsed_url.path
        if len(display_url) > 90:
            display_url = display_url[:87] + "..."

        results.append(
            SearchResult(
                title=title[:180],
                url=url,
                display_url=display_url,
                snippet=snippet[:360],
            )
        )
        if len(results) >= RESULTS_PER_PAGE:
            break

    return results


def fetch_results(query: str, page: int) -> list[SearchResult]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Nintendo Wii; U; ; 3642; en) "
            "Opera/9.30 (Nintendo Wii; U; ; 3642; en)"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.8",
    }
    payload = {"q": query, "s": str((page - 1) * RESULTS_PER_PAGE)}

    try:
        response = requests.post(
            DUCKDUCKGO_HTML_URL,
            data=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise SearchError("The search service could not be reached.") from exc

    results = parse_results(response.text)
    if not results and "result__a" not in response.text:
        raise SearchError("The search service returned an unexpected page.")
    return results


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024

    @app.after_request
    def add_legacy_friendly_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/")
    def index():
        raw_query = request.args.get("q", "")
        query = clean_text(raw_query)[:MAX_QUERY_LENGTH]

        try:
            page = max(1, min(int(request.args.get("page", "1")), 50))
        except ValueError:
            page = 1

        if not query:
            return render_template("index.html", query="")

        try:
            results = fetch_results(query, page)
            error = None
        except SearchError as exc:
            app.logger.warning("Search failed: %s", exc)
            results = []
            error = str(exc)

        return render_template(
            "results.html",
            query=query,
            query_encoded=quote_plus(query),
            results=results,
            error=error,
            page=page,
        )

    @app.get("/favicon.ico")
    def favicon():
        return Response(status=204)

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("error.html", message="That page was not found."), 404

    @app.errorhandler(413)
    def too_large(_error):
        return render_template("error.html", message="That request was too large."), 413

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)