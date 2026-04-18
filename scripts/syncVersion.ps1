param(
	[Parameter(Mandatory = $true)]
	[string]$Version
)

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
	Write-Error 'Version must be in semver format (e.g. 1.2.3)'
	exit 1
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$files = Get-ChildItem -Path $root -Recurse -Filter 'package.json' |
	Where-Object { $_.FullName -notmatch '\\node_modules\\' }

$updated = 0

foreach ($file in $files) {
	$content = Get-Content $file.FullName -Raw

	if ($content -notmatch '"version"\s*:\s*"([^"]+)"') {
		continue
	}

	$current = $Matches[1]
	$newContent = $content -replace '"version"\s*:\s*"[^"]+"', """version"": ""$Version"""
	Set-Content -Path $file.FullName -Value $newContent -NoNewline
	Write-Host "  $($file.FullName)  $current ~> $Version"
	$updated++
}

Write-Host ""
Write-Host "$updated package.json file(s) updated to $Version"
