# Form validation

Apply this skill when a web form lets bad data through, rejects good data, or shows errors that the person filling it in cannot understand.

## Two layers, one set of rules

Client-side validation is for the person: it gives quick feedback. Server-side validation is for the system: it is the only check that counts, because any request can be sent without the form. Every rule exists on the server; the client repeats the ones it can.

Keep the rules in one place when you can - a shared schema in Zod, Yup or Valibot used by both the browser bundle and the Node handler, or a JSON Schema that both sides load. In other stacks (Django forms, Rails validations, Laravel FormRequest) mirror the server rules in the client deliberately and list them together.

## Steps

1. List each field with its type, required flag, length, format and cross-field rules (end date after start date, password confirmation).
2. Start with HTML attributes: `type="email"`, `required`, `minlength`, `pattern`, `inputmode`, `autocomplete`. They are free and accessible.
3. Validate on blur, not on every keystroke; revalidate on input once a field has shown an error.
4. On submit, validate everything, focus the first invalid field, and show an error summary at the top for long forms.
5. On the server, return a 422 with field-keyed errors, for example `{ "errors": { "email": "This address is already registered" } }`, and map them back to the fields.
6. Write tests for each rule on the server, and one end-to-end test of the error display.

## Messages

| Bad | Good |
|---|---|
| Invalid input | Enter a date in the format DD/MM/YYYY |
| Error 1042 | This postcode is not in our delivery area |
| Field required | Enter your phone number |

Say what is wrong and how to fix it, in the user's words. Put the message next to the field, link it with `aria-describedby`, and set `aria-invalid="true"`. Do not clear what the user typed.

## Pitfalls

- Email regexes that reject valid addresses with `+` or new TLDs. Check for an `@` and a dot, then send a confirmation mail.
- Names: do not require a first and last name or restrict characters; people have one name, apostrophes and diacritics.
- Phone numbers: store in E.164, accept spaces and dashes on input (libphonenumber).
- Trimming: trim whitespace before validation, not after.
- Double submit: disable the button while the request is in flight and make the endpoint idempotent.
- Numbers: locale decimal separators (1,5 vs 1.5).

Screen-reader announcements of errors are checked with accessibility-audit. Injection and other untrusted-input risks on the server belong to security, and the endpoint's error format to api-design.
