# Documents

Apply this skill when you produce or edit a file that people will read, print, present or fill in: a PDF, a workbook, a deck, a Word document, or text published to customers.

## Routing

| Output | Skill |
|---|---|
| Fillable PDF, merging or splitting PDFs | pdf-forms |
| Workbook calculations | spreadsheet-formulas |
| A presentation | slide-decks |
| Customer-facing notes for a product version | release-notes |
| Reference for an HTTP API | api-reference-docs |

Developer documentation inside a repository (README, changelog) has its own skills: readme-writing and changelog.

## Before writing

- Who reads it, and what do they do next? A procurement officer approving a purchase needs a different document from an engineer installing the product.
- Which format will they open? Do not send a `.docx` to someone who only has a phone; a PDF or a web page may serve better. Check whether the organisation has a template (`.dotx`, `.potx`, `.xltx`) with its fonts and logo.
- Is it editable afterwards? Keep a source (Markdown, DOCX, the spreadsheet) next to any exported PDF.

## Building the file

Prefer generating documents from data and templates over hand-editing when they repeat: python-docx or docxtpl for Word, openpyxl or xlsxwriter for Excel, python-pptx for PowerPoint, Pandoc for Markdown to DOCX/PDF/HTML, WeasyPrint or a headless browser for HTML to PDF, LibreOffice in headless mode (`soffice --headless --convert-to pdf`) for batch conversion.

## Quality checklist

- [ ] Title, date and version or revision on the first page
- [ ] Headings use the document's styles, so the table of contents and PDF bookmarks work
- [ ] Page size matches the audience (A4 or US Letter)
- [ ] Fonts embedded in the PDF (check with `pdffonts`)
- [ ] Images at sufficient resolution for print (300 dpi) but compressed for email
- [ ] Tagged PDF and alt text for accessibility (PDF/UA) where required
- [ ] Metadata cleaned: author, comments, tracked changes, hidden sheets
- [ ] File name says what it is: `2026-11-quarterly-report-v2.pdf`, not `final_FINAL.pdf`

## Pitfalls

- Tracked changes and comments left in a document sent outside the company.
- Hidden rows or sheets in a shared workbook that contain data the recipient must not see.
- Redaction by drawing a black box over text; the text remains selectable. Use a real redaction tool that removes content.
- Archival requirements: some recipients require PDF/A.

Text that must reach readers in another language goes through translation. Emails that carry the document are drafted with email-drafting.
