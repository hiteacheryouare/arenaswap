$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$outputDir = Join-Path $root 'apps\extension\.output'
$distDir = Join-Path $root 'apps\extension\dist'

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

Write-Host 'Done. Zips written to apps/extension/dist/'
