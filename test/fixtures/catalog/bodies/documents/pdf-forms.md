# PDF forms

Apply this skill when a PDF form has to be filled by a program, its fields read back, or its pages merged, split, rotated or reordered.

## Know what kind of form it is

1. AcroForm: the classic interactive form. Fields have names and types (text, checkbox, radio, choice, signature). Most libraries support it.
2. XFA: an XML-based form from Adobe LiveCycle, common in government forms. Many libraries cannot fill it; check for an `/XFA` entry in the AcroForm dictionary. Options are Adobe tools, a commercial SDK, or flattening to a static PDF and overlaying text.
3. No fields at all: a scanned or "flat" form. You must overlay text at coordinates (reportlab or pdf-lib) on top of the page.

List the fields first:

```
qpdf --json in.pdf | jq '.acroform.fields[] | {name: .fullname, type: .fieldtype}'
```

or in Python with pypdf: `PdfReader("in.pdf").get_fields()`.

## Filling

- Python: pypdf (`writer.update_page_form_field_values`), or pdfrw; PyMuPDF (`fitz`) for widgets and appearance streams.
- JavaScript: pdf-lib (`form.getTextField('name').setText(...)`).
- Java: Apache PDFBox. Command line: `pdftk in.pdf fill_form data.fdf output out.pdf`.

Checkbox and radio values are export names such as `/Yes` or `/On`, not `true`; read the field's `/_States_` to find them. Set `NeedAppearances` true, or generate appearance streams, otherwise some viewers show empty fields.

## Flattening

Flattening turns field values into ordinary page content so they can no longer be edited. Do it for archived or sent copies: `pdftk out.pdf output final.pdf flatten`, `qpdf --flatten-annotations=all`, or PyMuPDF. Check that non-Latin text survived; the field's font may lack the glyphs, in which case embed a font that has them.

## Merging and splitting

| Task | Command |
|---|---|
| Merge | `qpdf --empty --pages a.pdf b.pdf -- merged.pdf` |
| Pages 3-7 | `qpdf in.pdf --pages . 3-7 -- part.pdf` |
| Rotate page 2 | `qpdf in.pdf out.pdf --rotate=+90:2` |
| Split each page | `qpdf --split-pages in.pdf page-%d.pdf` |

Merging two filled forms with the same field names makes them share values; rename fields or flatten before merging.

## Pitfalls

- Encrypted PDFs with an owner password refuse edits; `qpdf --decrypt` works only when you are entitled to remove it.
- Digital signatures break when the file changes after signing; fill first, sign last.
- Text extraction for reading back filled values from flattened files needs pdfplumber or OCR (Tesseract) for scans.

General rules for documents meant for people sit in documents. Patterns for parsing extracted text are written with regex-help, and a batch script that runs these commands follows shell-scripts.
