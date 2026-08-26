# cleanup_disk.ps1
# 清理测试产物和缓存文件，释放磁盘空间
# 使用方法：以管理员身份运行 PowerShell，执行 .\scripts\cleanup_disk.ps1

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  清理测试产物和缓存文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 统计清理前的空间
$beforeSize = 0

# 1. 清理测试产物目录
$testArtifactDirs = @(
    "workspace\test-results",
    "workspace\allure-results",
    "workspace\allure-heal-results",
    "workspace\allure-report",
    "workspace\logs"
)

Write-Host "[1/6] 清理测试产物目录..." -ForegroundColor Yellow
foreach ($dir in $testArtifactDirs) {
    $fullPath = Join-Path $ProjectRoot $dir
    if (Test-Path $fullPath) {
        $dirSize = (Get-ChildItem -Path $fullPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        $beforeSize += $dirSize
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ 已清理: $dir ($([math]::Round($dirSize, 2)) MB)" -ForegroundColor Green
    }
}

# 2. 清理 Python 缓存
Write-Host ""
Write-Host "[2/6] 清理 Python 缓存..." -ForegroundColor Yellow
$pyCacheDirs = Get-ChildItem -Path $ProjectRoot -Directory -Recurse -Filter "__pycache__" -ErrorAction SilentlyContinue
foreach ($dir in $pyCacheDirs) {
    $dirSize = (Get-ChildItem -Path $dir.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    $beforeSize += $dirSize
    Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已清理: $($dir.FullName.Replace($ProjectRoot, '.')) ($([math]::Round($dirSize, 2)) MB)" -ForegroundColor Green
}

# 3. 清理 .pyc 文件
Write-Host ""
Write-Host "[3/6] 清理 .pyc 文件..." -ForegroundColor Yellow
$pycFiles = Get-ChildItem -Path $ProjectRoot -File -Recurse -Filter "*.pyc" -ErrorAction SilentlyContinue
$pycSize = ($pycFiles | Measure-Object -Property Length -Sum).Sum / 1MB
if ($pycSize -gt 0) {
    $beforeSize += $pycSize
    $pycFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已清理 .pyc 文件 ($([math]::Round($pycSize, 2)) MB)" -ForegroundColor Green
}

# 4. 清理 Playwright 浏览器缓存（可选，谨慎使用）
Write-Host ""
Write-Host "[4/6] 检查 Playwright 浏览器缓存..." -ForegroundColor Yellow
$playwrightCachePath = "$env:LOCALAPPDATA\ms-playwright"
if (Test-Path $playwrightCachePath) {
    $cacheSize = (Get-ChildItem -Path $playwrightCachePath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  ⚠ Playwright 浏览器缓存: $([math]::Round($cacheSize, 2)) MB" -ForegroundColor Yellow
    Write-Host "  提示: 如需清理，请设置环境变量 PLAYWRIGHT_BROWSERS_PATH 到其他盘后重新安装" -ForegroundColor Gray
} else {
    Write-Host "  ✓ 未发现 Playwright 浏览器缓存" -ForegroundColor Green
}

# 5. 清理 Node.js 缓存
Write-Host ""
Write-Host "[5/6] 清理 Node.js 缓存..." -ForegroundColor Yellow
$nodeCachePath = "$env:APPDATA\npm-cache"
if (Test-Path $nodeCachePath) {
    $cacheSize = (Get-ChildItem -Path $nodeCachePath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  ⚠ npm 缓存: $([math]::Round($cacheSize, 2)) MB" -ForegroundColor Yellow
    Write-Host "  提示: 可运行 'npm cache clean --force' 清理" -ForegroundColor Gray
}

# 6. 清理临时文件
Write-Host ""
Write-Host "[6/6] 清理临时文件..." -ForegroundColor Yellow
$tempDirs = @(
    "$env:TEMP\playwright-*",
    "$env:TEMP\.playwright-*"
)
foreach ($pattern in $tempDirs) {
    $tempFiles = Get-Item -Path $pattern -ErrorAction SilentlyContinue
    foreach ($file in $tempFiles) {
        $fileSize = (Get-ChildItem -Path $file.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        $beforeSize += $fileSize
        Remove-Item -Path $file.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ 已清理: $($file.Name) ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    }
}

# 总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  清理完成！" -ForegroundColor Green
Write-Host "  预计释放空间：$([math]::Round($beforeSize, 2)) MB" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "建议：" -ForegroundColor Yellow
Write-Host "1. 设置环境变量 PLAYWRIGHT_BROWSERS_PATH 将浏览器安装到其他盘" -ForegroundColor Gray
Write-Host "2. 定期运行此脚本清理测试产物" -ForegroundColor Gray
Write-Host "3. 在 .env 文件中添加：PLAYWRIGHT_BROWSERS_PATH=D:\你的路径\.browsers" -ForegroundColor Gray
