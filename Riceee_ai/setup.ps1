# Riceee AI Setup Script
Write-Host "🚀 Setting up Riceee AI..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Navigate to Riceee_ai directory
Set-Location -Path "Riceee_ai"

# Install Python dependencies
Write-Host "`n📦 Installing Python dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nTo start the AI server, run:" -ForegroundColor Yellow
Write-Host "  cd Riceee_ai" -ForegroundColor White
Write-Host "  python riceee_api.py" -ForegroundColor White
