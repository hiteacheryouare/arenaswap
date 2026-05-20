$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$outputDir = Join-Path $root 'apps\extension\.output'
$distDir = Join-Path $root 'apps\extension\dist'
$remoteUrl = git -C $root remote get-url origin
$currentBranch = git -C $root rev-parse --abbrev-ref HEAD

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$builds = @(
	@{ Browser = 'chrome-mv3';  Name = 'arenaswap-chrome' },
	@{ Browser = 'edge-mv3';    Name = 'arenaswap-edge' },
	@{ Browser = 'firefox-mv3'; Name = 'arenaswap-firefox' }
)

Write-Host 'Zipping builds...'

foreach ($build in $builds) {
	$dir = Join-Path $outputDir $build.Browser
	$zip = Join-Path $distDir "$($build.Name).zip"

	if (-not (Test-Path $dir)) {
		Write-Host "  skip $($build.Browser) (not built)"
		continue
	}

	if (Test-Path $zip) { Remove-Item $zip }
	Compress-Archive -Path "$dir\*" -DestinationPath $zip
	Write-Host "  $($build.Browser) ~> $($build.Name).zip"
}

Write-Host 'Zipping source...'

$sourceZip = Join-Path $distDir 'arenaswap-source.zip'
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

Write-Host "  cloning $remoteUrl ($currentBranch)..."
git clone --branch $currentBranch --single-branch $remoteUrl (Join-Path $tmpDir 'arenaswap') 2>$null

if (Test-Path $sourceZip) { Remove-Item $sourceZip }
Compress-Archive -Path (Join-Path $tmpDir 'arenaswap') -DestinationPath $sourceZip
Remove-Item -Recurse -Force $tmpDir
Write-Host '  source ~> arenaswap-source.zip'

Write-Host 'Done. Zips written to apps/extension/dist/'
