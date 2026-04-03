# Savage Frameworks - Technology Living Standards Reference

> **Document Version:** 0.1.0  
> **Last Updated:** 2026-04  
> **Project:** Savage Frameworks  
> **Repository:** https://github.com/savagenights/savage_frameworks.git

---

## Core Web Standards

| Technology | Current Standard / Version | Official Link | Organization | Notes |
|------------|---------------------------|---------------|--------------|-------|
| **HTML** | HTML Living Standard | https://html.spec.whatwg.org/ | WHATWG | Continuously updated - authoritative source |
| **CSS** | CSS Snapshot 2023 | https://www.w3.org/TR/css-2023/ | W3C | Individual modules updated separately |
| **JavaScript** | ECMAScript 2025 (ES2025) | https://ecma-international.org/publications-and-standards/standards/ecma-262/ | Ecma TC39 | ES2026 draft in progress |
| **DOM** | DOM Living Standard | https://dom.spec.whatwg.org/ | WHATWG | Core document and object model |
| **URL** | URL Living Standard | https://url.spec.whatwg.org/ | WHATWG | Defines URL parsing & API |
| **Streams** | Streams Living Standard | https://streams.spec.whatwg.org/ | WHATWG | Powers Fetch, ReadableStream, etc. |
| **Fetch** | Fetch Living Standard | https://fetch.spec.whatwg.org/ | WHATWG | Modern HTTP networking API |

---

## Reference Libraries

| Technology | Version | Official Link | Notes |
|------------|---------|---------------|-------|
| **React** | 19.2.x | https://react.dev/ | Reference architecture for reactive patterns (not formal standard) |

---

## Framework Compliance Targets

Savage Frameworks aims to:
- **Follow** HTML Living Standard for template syntax and DOM operations
- **Leverage** CSS Snapshot 2023 with support for CSS Modules
- **Target** ECMAScript 2025 (ES2025) as baseline, with ES2026 features where supported
- **Implement** DOM Living Standard for all DOM manipulation APIs
- **Provide** reactive state management inspired by modern patterns

---

## Quick Reference

- **WHATWG specs** (HTML, URL, Streams, Fetch, DOM) are **Living Standards** — always refer to the living version as the authoritative source
- **OpenAPI 3.2.0** recommended for any API integrations
- **ES2025** is the JavaScript baseline for this framework

---

## Document Maintenance

This document must be reviewed and updated:
- When new ECMAScript versions are released
- When CSS Snapshot updates
- When WHATWG Living Standards receive significant changes
- Document all updates in DEVELOPMENT.md under "Standards Updates"
