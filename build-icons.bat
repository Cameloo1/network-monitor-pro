@echo off
echo Building Network Monitor Pro Icons...
echo.

REM Check if ImageMagick is installed
where magick >nul 2>nul
if %errorlevel% neq 0 (
    echo ImageMagick not found. Please install ImageMagick first.
    echo Download from: https://imagemagick.org/script/download.php
    echo.
    echo Alternative: Use online SVG to PNG converters:
    echo - https://convertio.co/svg-png/
    echo - https://cloudconvert.com/svg-to-png
    echo.
    pause
    exit /b 1
)

echo Converting SVG to PNG icons...

REM Convert to different sizes
magick icons\icon.svg -resize 16x16 icons\icon16.png
magick icons\icon.svg -resize 32x32 icons\icon32.png
magick icons\icon.svg -resize 48x48 icons\icon48.png
magick icons\icon.svg -resize 128x128 icons\icon128.png

echo.
echo Icons created successfully!
echo.
echo Icon files created:
dir icons\*.png /b
echo.
pause 