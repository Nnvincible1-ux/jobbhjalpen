#!/usr/bin/env python3
"""Build server/articles-yrken2-seed.ts from the parallel map JSON output."""
import json, re

with open("/home/ubuntu/cv_yrkesguider.json", encoding="utf-8") as f:
    data = json.load(f)

rows = []
seen = set()
sort = 40
for item in data["results"]:
    o = item.get("output") or {}
    slug = (o.get("slug") or "").strip()
    if not slug or slug in seen:
        continue
    seen.add(slug)
    rows.append({
        "slug": slug,
        "kind": "cluster",
        "title": o.get("title", "").strip(),
        "metaTitle": o.get("meta_title", "").strip(),
        "metaDescription": o.get("meta_description", "").strip(),
        "excerpt": o.get("excerpt", "").strip(),
        "body": o.get("body_markdown", "").strip(),
        "keyword": "cv exempel " + item["input"],
        "answerBlock": o.get("answer_block", "").strip(),
        "relatedSlugs": "skriva-cv,cv-mall,soka-jobb",
        "ctaServiceSlug": "cv-granskning",
        "faqJson": o.get("faq_json", "").strip(),
        "sortOrder": sort,
    })
    sort += 1

# Validate faq_json is parseable; null it if not.
for r in rows:
    fq = r["faqJson"]
    if fq:
        try:
            json.loads(fq)
        except Exception:
            r["faqJson"] = ""

header = (
    "import type { ArticleSeed } from \"./articles-seed\";\n\n"
    "// Auto-generated profession guides (AEO/GEO optimized). Do not edit by hand.\n"
    "export const YRKES2_ARTICLES: (ArticleSeed & { answerBlock?: string })[] = "
)
out = header + json.dumps(rows, ensure_ascii=False, indent=2) + ";\n"
with open("/home/ubuntu/jobbhjalpen/server/articles-yrken2-seed.ts", "w", encoding="utf-8") as f:
    f.write(out)
print(f"Wrote {len(rows)} guides")
