# Local HTTPS Proxy

This proxy exposes the local dev app over HTTPS:

- `https://<laptop-ip>/` -> Angular dev server on `4200`
- `https://<laptop-ip>/api/` -> Java backend on `8080`

Generate the local web certificates with `init.ps1`:

```powershell
cd C:\Matchboard\workflow
.\scripts\init.ps1 -WebHost matchboard.local -WebIp 192.168.0.49
```

That creates:

```text
C:\Matchboard\certs\web\matchboard.pem
C:\Matchboard\certs\web\matchboard.key
C:\Matchboard\certs\web\matchboard-local-ca.pem
```

Run the HTTPS proxy:

```powershell
docker run --rm --name matchboard-local-https `
  -p 443:443 `
  -v C:\Matchboard\workflow\client\local-https\nginx.conf:/etc/nginx/nginx.conf:ro `
  -v C:\Matchboard\certs\web:/etc/nginx/certs:ro `
  nginx:1.29-alpine
```

Open on the tablet:

```text
https://192.168.0.49/
```

The tablet must trust this CA:

```text
C:\Matchboard\certs\web\matchboard-local-ca.pem
```

Install that root certificate on the tablet as a trusted certificate authority.
