listener "tcp" {
 address     = "0.0.0.0:8200"
 tls_cert_file = "/vault/certs/vault.pem"
 tls_key_file  = "/vault/certs/vault.key"
}

storage "file" {
 path = "/vault/data"
}

ui = true