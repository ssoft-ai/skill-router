# TLS certificates

Apply this skill when a certificate is issued, renewed or installed, when browsers or clients report a certificate error, or when an expiry date is close.

## Diagnose a handshake or chain error

Start from the client's exact error, then look at what the server sends:

```
openssl s_client -connect example.com:443 -servername example.com -showcerts </dev/null
openssl x509 -in cert.pem -noout -subject -issuer -dates -ext subjectAltName
curl -vI https://example.com
```

| Error | Usual cause | Fix |
|---|---|---|
| `NET::ERR_CERT_DATE_INVALID`, "certificate has expired" | renewal failed, or the client clock is wrong | renew; check the clock |
| "unable to get local issuer certificate" | server does not send the intermediate | serve the full chain (`fullchain.pem`) |
| `ERR_CERT_COMMON_NAME_INVALID` | hostname not in subjectAltName | reissue with the right SANs; CN alone is ignored |
| "self-signed certificate in chain" | private CA not trusted by the client | add the CA to the client trust store, or use a public CA |
| handshake failure, no shared cipher | old client vs TLS 1.2+/modern ciphers | adjust ciphers deliberately or upgrade the client |
| works in browser, fails in Java/Python | missing intermediate cached by browsers only | serve the full chain |

SSL Labs' server test gives a full report for public hosts. `testssl.sh` does the same from the command line.

## Issuing and renewing

- ACME with Let's Encrypt or another ACME CA: certbot, acme.sh, Caddy (automatic), Traefik, or cert-manager on Kubernetes. HTTP-01 challenges need port 80 reachable; DNS-01 is needed for wildcards and internal hosts.
- Certificates are valid for shorter periods each year; plan for automated renewal, never for a calendar reminder alone.
- Generate the private key on the server that uses it; never email it. Store keys with `chmod 600`.
- For a commercial CA: generate a CSR with the right SANs (`openssl req -new -key key.pem -subj "/CN=example.com" -addext "subjectAltName=DNS:example.com,DNS:www.example.com"`).

## Installing

- Nginx: `ssl_certificate` points at the full chain, `ssl_certificate_key` at the key; `nginx -t` then reload.
- Load balancers (AWS ACM, Azure Application Gateway) and CDNs hold their own copy; renew there too.
- Java keystores: convert with `openssl pkcs12 -export` and import with `keytool`.

## Monitoring

Alert at 30 and 14 days before expiry for every endpoint, including internal ones and mTLS client certificates. Certificate Transparency logs (crt.sh) show every certificate issued for your domains - useful for spotting forgotten hosts and mis-issuance.

## Pitfalls

- Renewal hook that renews the file but never reloads the server.
- HSTS preload set before every subdomain supports HTTPS.
- Pinning certificates in a mobile app without a backup pin.

Server configuration and reload commands are covered by linux-admin, expiry alerts by alert-tuning, and the parent rules by security.
