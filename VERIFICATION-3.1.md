# Verification — 3.1

This is a tested source release, not a claim that every input, browser or deployment will work.

22 Node tests and 5 native media tests passed (27 total). Script validation passed for 26 scripts.

## Current checks

- All tool pages, root browser scripts, CSS and critical libraries served successfully; all script references exist and parse.
- Existing regression checks exercise English/Hindi OCR and searchable PDFs, QR SVG/PNG, invalid-image recovery, request diagnostics, asset routing and backend protection.
- Advanced media tests exercise actual image/PDF/video cleanup, dimensions, untouched PDF text and retained video audio.
- Invoice tests cover percentage/fixed discount equivalence, discount-before-tax, rounding, caps and fractional quantities. Browser quantity ArrowUp changed 1 to 2. Exported PDF contains 2 kg, Discount (10%) and INR 5,310.00 for a 5,000 subtotal with 18% tax.
- Private pack browser lock/unlock succeeded; extracted bytes matched the original. Automated checks reject wrong passwords/tampering and confirm fresh encryption differs.
- Duplicate browser scan found the two identical files with different names; manifest verification matched both. Unique ZIP contained exactly one byte-identical original. SHA-256 tested against a known vector.
- Booklet browser exported a five-page source into four landscape sides with expected blank panels and page order. Ordering checked for every source size 1–200.
- Contact-sheet browser export opened and was visually inspected for captions, numbering and proportions.

## Remaining limits

Successful YouTube/Instagram/Facebook link downloads are not verified; the earlier live YouTube attempt failed. No claim of universally working social downloads is made. Inpainting cannot perfectly recover covered content. Physical iOS/Android, camera/microphone hardware, arbitrary codecs, printer duplex direction, large-file load, Docker and public deployment require environment-specific checks. Existing browser-only tools were retained; route/syntax regression checks are not full end-to-end tests of every old tool and option. Earlier specific browser checks are recorded in README.md and REPAIR-REPORT.md.
