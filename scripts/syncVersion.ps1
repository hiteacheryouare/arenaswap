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

$readme = Join-Path $root '.github/README.md'
if (-not (Test-Path $readme)) {
	$fallbackReadme = Join-Path $root 'README.md'
	if (Test-Path $fallbackReadme) {
		$readme = $fallbackReadme
	}
}

if (Test-Path $readme) {
	$rootPackagePath = Join-Path $root 'package.json'
	$extensionPackagePath = Join-Path $root 'apps/extension/package.json'
	$tsconfigPath = Join-Path $root 'tsconfig.base.json'

	$rootPackage = Get-Content $rootPackagePath -Raw | ConvertFrom-Json
	$extensionPackage = Get-Content $extensionPackagePath -Raw | ConvertFrom-Json
	$tsconfig = Get-Content $tsconfigPath -Raw | ConvertFrom-Json

	$getDependencyVersion = {
		param(
			$pkg,
			[string]$name
		)

		if ($pkg.PSObject.Properties.Name -contains 'dependencies' -and $pkg.dependencies.PSObject.Properties.Name -contains $name) {
			return $pkg.dependencies.$name
		}

		if ($pkg.PSObject.Properties.Name -contains 'devDependencies' -and $pkg.devDependencies.PSObject.Properties.Name -contains $name) {
			return $pkg.devDependencies.$name
		}

		return ''
	}

	$cleanVersion = {
		param([string]$value)
		return ([string]$value -replace '^[^\d]*', '' -split '-')[0]
	}

	$majorVersion = {
		param([string]$value)
		$clean = & $cleanVersion $value
		return ($clean -split '\.')[0]
	}

	$majorMinorVersion = {
		param([string]$value)
		$clean = & $cleanVersion $value
		$parts = $clean -split '\.'

		if ($parts.Count -lt 2) {
			return $parts[0]
		}

		return "$($parts[0]).$($parts[1])"
	}

	$npmVersion = ''
	if ($rootPackage.packageManager -match '^npm@(\d+)') {
		$npmVersion = $Matches[1]
	}

	$badgeValues = @{
		React = (& $majorVersion (& $getDependencyVersion $extensionPackage 'react'))
		TypeScript = (& $majorVersion (& $getDependencyVersion $rootPackage 'typescript'))
		JavaScript = [string]$tsconfig.compilerOptions.target
		WXT = (& $majorMinorVersion (& $getDependencyVersion $extensionPackage 'wxt'))
		TailwindCSS = (& $majorVersion (& $getDependencyVersion $extensionPackage 'tailwindcss'))
		Bootstrap = (& $majorVersion (& $getDependencyVersion $extensionPackage 'bootstrap'))
		Turborepo = (& $majorVersion (& $getDependencyVersion $rootPackage 'turbo'))
		npm = $npmVersion
		version = $Version
	}

	$replacements = @(
		@{ Pattern = '(badge/React-)[^-]+(-61DAFB\?logo=react&logoColor=black\))'; Value = $badgeValues.React },
		@{ Pattern = '(badge/TypeScript-)[^-]+(-3178C6\?logo=typescript&logoColor=white\))'; Value = $badgeValues.TypeScript },
		@{ Pattern = '(badge/JavaScript-)[^-]+(-F7DF1E\?logo=javascript&logoColor=black\))'; Value = $badgeValues.JavaScript },
		@{ Pattern = '(badge/WXT-)[^-]+(-FF6B35\?logo=googlechrome&logoColor=white\))'; Value = $badgeValues.WXT },
		@{ Pattern = '(badge/TailwindCSS-)[^-]+(-06B6D4\?logo=tailwindcss&logoColor=white\))'; Value = $badgeValues.TailwindCSS },
		@{ Pattern = '(badge/Bootstrap-)[^-]+(-7952B3\?logo=bootstrap&logoColor=white\))'; Value = $badgeValues.Bootstrap },
		@{ Pattern = '(badge/Turborepo-)[^-]+(-EF4444\?logo=turborepo&logoColor=white\))'; Value = $badgeValues.Turborepo },
		@{ Pattern = '(badge/npm-)[^-]+(-CB3837\?logo=npm&logoColor=white\))'; Value = $badgeValues.npm },
		@{ Pattern = '(badge/version-)[^-]+(-brightgreen\))'; Value = $badgeValues.version }
	)

	$content = Get-Content $readme -Raw
	$readmeUpdated = $false

	foreach ($replacement in $replacements) {
		if ([string]::IsNullOrWhiteSpace([string]$replacement.Value)) {
			continue
		}

		$newContent = [regex]::Replace(
			$content,
			$replacement.Pattern,
			('$1{0}$2' -f $replacement.Value)
		)

		if ($newContent -ne $content) {
			$readmeUpdated = $true
		}

		$content = $newContent
	}

	if ($readmeUpdated) {
		Set-Content -Path $readme -Value $content -NoNewline
		Write-Host "  $readme  badges synced"
	} else {
		Write-Host "  $readme  badges already synced"
	}
}

Write-Host ""
Write-Host "$updated package.json file(s) updated to $Version"
