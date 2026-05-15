param(
    [string]$Key1,
    [string]$Key2,
    [string]$Key3,
    [string]$DbPassword,
    [string]$VaultPassword,
    [string]$WebHost = "matchboard.local",
    [string]$WebIp,
    [string]$WebCertsPath = "c:/Matchboard/certs/web",
    [string]$HttpsProxyConfigPath = "c:/Matchboard/workflow/client/local-https/nginx.conf",
    [int]$CertDays = 825,
    [switch]$RenewWebCert
)

$vaultContainerName = "vault-prod"
$dbContainerName = "postgres-db"
$httpsProxyContainerName = "matchboard-local-https"
$dbRootPath = "c:/Matchboard/db"
$vaultRootPath = "c:/Matchboard/workflow/vault"
$vaultDataPath = "${vaultRootPath}/data"
$vaultConfigPath = "${vaultRootPath}/config"
$vaultCertsPath = "${vaultRootPath}/cert"
$crtFile = "${vaultCertsPath}\vault.pem"
$dnsName = "127.0.0.1"
$dbSecretPath = "secret/postgres"
$opensslPath = "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"


# ------------------------------------------------------------
# Function: Log Output
# ------------------------------------------------------------
function Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
}

function Get-DefaultLocalIp {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object {
                $_.IPAddress -notlike "127.*" `
                    -and $_.IPAddress -notlike "169.254.*" `
                    -and $_.InterfaceAlias -notlike "*Loopback*" `
                    -and $_.InterfaceAlias -notlike "*vEthernet*" `
                    -and $_.PrefixOrigin -ne "WellKnown"
            } |
            Select-Object -First 1

    if ($null -eq $candidate) {
        throw "Could not determine a local IPv4 address. Pass -WebIp explicitly."
    }

    return $candidate.IPAddress
}

function Ensure-WebCertificate {
    param(
        [string]$CertsPath,
        [string]$HostName,
        [string]$IpAddress,
        [int]$Days,
        [bool]$Renew
    )

    $caKey = Join-Path $CertsPath "matchboard-local-ca.key"
    $caPem = Join-Path $CertsPath "matchboard-local-ca.pem"
    $serverKey = Join-Path $CertsPath "matchboard.key"
    $serverCsr = Join-Path $CertsPath "matchboard.csr"
    $serverPem = Join-Path $CertsPath "matchboard.pem"
    $serverExt = Join-Path $CertsPath "matchboard.ext"

    if (!(Test-Path $CertsPath)) {
        Log "Creating web certs folder at $CertsPath..."
        New-Item -ItemType Directory -Path $CertsPath -Force | Out-Null
    }

    if ($Renew) {
        Log "Renewing web certificate files..."
        Remove-Item -Path $serverKey, $serverCsr, $serverPem, $serverExt -Force -ErrorAction SilentlyContinue
    }

    if (!(Test-Path $caPem) -or !(Test-Path $caKey)) {
        Log "Creating local Matchboard certificate authority..."
        & $opensslPath req -x509 -newkey rsa:4096 -sha256 -days $Days -nodes `
            -keyout $caKey `
            -out $caPem `
            -subj "/CN=Matchboard Local CA"

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create local Matchboard certificate authority."
        }
    }

    $ext = @"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
DNS.1=$HostName
DNS.2=localhost
IP.1=$IpAddress
IP.2=127.0.0.1
"@

    Set-Content -Path $serverExt -Value $ext -NoNewline

    if (!(Test-Path $serverPem) -or !(Test-Path $serverKey)) {
        Log "Creating web server certificate for $HostName and $IpAddress..."
        & $opensslPath req -new -newkey rsa:4096 -nodes `
            -keyout $serverKey `
            -out $serverCsr `
            -subj "/CN=$HostName"

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create web server certificate signing request."
        }

        & $opensslPath x509 -req -sha256 -days $Days `
            -in $serverCsr `
            -CA $caPem `
            -CAkey $caKey `
            -CAcreateserial `
            -out $serverPem `
            -extfile $serverExt

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create web server certificate."
        }
    }
    else {
        Log "Web server certificate already exists."
    }

    Log "Web HTTPS certificate: $serverPem"
    Log "Web HTTPS private key: $serverKey"
    Log "Install this CA on the tablet as trusted: $caPem"
}

function Ensure-HttpsProxy {
    param(
        [string]$ContainerName,
        [string]$ConfigPath,
        [string]$CertsPath
    )

    if (!(Test-Path $ConfigPath)) {
        throw "HTTPS proxy config not found: $ConfigPath"
    }

    if (!(Test-Path (Join-Path $CertsPath "matchboard.pem")) -or !(Test-Path (Join-Path $CertsPath "matchboard.key"))) {
        throw "HTTPS proxy certificate files are missing from: $CertsPath"
    }

    $existingContainer = docker ps -a --format "{{.Names}}" | Select-String "^$ContainerName$"
    $runningContainer = docker ps --format "{{.Names}}" | Select-String "^$ContainerName$"

    if ($runningContainer) {
        Log "HTTPS proxy already running..."
    }
    elseif ($existingContainer) {
        Log "HTTPS proxy container exists but is stopped. Starting it..."
        docker start $ContainerName
    }
    else {
        Log "Starting HTTPS proxy container..."
        docker run -d --name $ContainerName `
            -p 443:443 `
            -v ${ConfigPath}:/etc/nginx/nginx.conf:ro `
            -v ${CertsPath}:/etc/nginx/certs:ro `
            nginx:1.29-alpine
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start HTTPS proxy. Check whether port 443 is already in use."
    }
}

# Check if running as Administrator
$isAdmin = [Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()

if (-not $isAdmin.IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {

    Log "This script must be run as Administrator."
    exit 1
}

# ------------------------------------------------------------
# Step 1. Ensure Docker Service Running
# ------------------------------------------------------------
Log "Checking Docker service..."

#Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

#Start-Sleep -Seconds 30

docker version

# Verify Docker availability
docker version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not available. Abort bootstrap."
}

Log "Docker is running."

if (-not $WebIp) {
    $WebIp = Get-DefaultLocalIp
}

Ensure-WebCertificate -CertsPath $WebCertsPath -HostName $WebHost -IpAddress $WebIp -Days $CertDays -Renew $RenewWebCert.IsPresent
Ensure-HttpsProxy -ContainerName $httpsProxyContainerName -ConfigPath $HttpsProxyConfigPath -CertsPath $WebCertsPath

# ------------------------------------------------------------
# Step 2. Generate certificate
# ------------------------------------------------------------
$firstRun = $false
if (!(Test-Path $vaultCertsPath)) {

    Log "Creating certs folder..."
    New-Item -ItemType Directory -Path $vaultCertsPath -Force | Out-Null
    $firstRun = $true
}

if (!(Test-Path $crtFile)) {

    Log "Certificate not found. Generating self-signed certificate..."
    & $opensslPath req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes -keyout ${vaultCertsPath}/vault.key -out ${vaultCertsPath}/vault.pem -subj "/CN=${dnsName}" -addext "subjectAltName=DNS:${dnsName},DNS:localhost,IP:${dnsName}"
    Log "Certificate exported to $crtFile"
}

# ------------------------------------------------------------
# Step 3. Start Vault Container
# ------------------------------------------------------------
$existingContainer = docker ps -a --format "{{.Names}}" | Select-String "^$vaultContainerName$"
$runningContainer  = docker ps --format "{{.Names}}" | Select-String "^$vaultContainerName$"

if ($runningContainer) {
    Log "Vault container already running..."
}
elseif ($existingContainer) {
    Log "Vault container exists but is stopped. Starting it..."
    docker start $vaultContainerName
    Start-Sleep -Seconds 15
    if (-not ($PSBoundParameters.ContainsKey("VaultPassword") -and $PSBoundParameters.ContainsKey("Key1") -and $PSBoundParameters.ContainsKey("Key2") -and $PSBoundParameters.ContainsKey("Key3")))
    {
        Log "Rerun init.ps1 with -VaultPassword -Key1 -Key2 and -Key3 options to unseal"
        return
    }
}
else
{
    Log "Starting Vault container..."
    docker run -d --name $vaultContainerName --cap-add=IPC_LOCK -p 8200:8200 -v ${vaultDataPath}:/vault/data -v ${vaultConfigPath}:/vault/config -v ${vaultCertsPath}:/vault/certs -e VAULT_ADDR="https://${dnsName}:8200" hashicorp/vault:latest vault server -config=/vault/config

    # Wait for Vault boot sequence
    Start-Sleep -Seconds 15

    if ($firstRun) {
        Log "Performing Vault initialization..."
        docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault operator init
        docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault secrets enable -path=secret kv-v2
        Log "Rerun init.ps1 with -VaultPassword -Key1 -Key2 and -Key3 options"
        return
    }
}

Log "Skipping initialization (Vault already initialized)."
if ($PSBoundParameters.ContainsKey("VaultPassword") -and $PSBoundParameters.ContainsKey("Key1") -and $PSBoundParameters.ContainsKey("Key2") -and $PSBoundParameters.ContainsKey("Key3"))
{
    Log "Unsealing vault."
    docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault operator unseal ${Key1}
    docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault operator unseal ${Key2}
    docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault operator unseal ${Key3}
    docker exec -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://127.0.0.1:8200" -it vault-prod vault login $VaultPassword
}
else
{
    Log "Skipping unsealing vault."
}

# ------------------------------------------------------------
# Step 4. Get db password
# ------------------------------------------------------------
docker exec -it -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault status

$dbPassword = (docker exec  -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault kv get -field=password secret/postgres).Trim()
if ($LASTEXITCODE -ne 0) {

    if(-not $PSBoundParameters.ContainsKey("DbPassword")) {
        Log "-DbPassword is required to establish db."
        return
    }
    docker exec  -e VAULT_SKIP_VERIFY="true" -e VAULT_ADDR="https://${dnsName}:8200" $vaultContainerName vault kv put $dbSecretPath password=$DbPassword
    $dbPassword = $DbPassword
    Log "Password created and stored in Vault."
}
else {
    Log "Password already exists in Vault."
}

# ------------------------------------------------------------
# Step 5. Start Db Container
# ------------------------------------------------------------
$existingContainer = docker ps -a --format "{{.Names}}" | Select-String "^$dbContainerName$"
$runningContainer  = docker ps --format "{{.Names}}" | Select-String "^$dbContainerName$"

if ($runningContainer) {
    Log "Db already running..."
}
elseif ($existingContainer) {
    Log "Db exists but is stopped. Starting it..."
    docker start $dbContainerName
}
else
{
    Log "Starting db container..."
    docker run -d --name $dbContainerName -p 5432:5432 -e POSTGRES_PASSWORD=$dbPassword -e POSTGRES_DB=matchboard -v ${dbRootPath}:/var/lib/postgresql postgres:18.3
}

Log "Bootstrap completed."
