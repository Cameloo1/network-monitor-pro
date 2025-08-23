@echo off
echo ========================================
echo Network Monitor Pro - Quick Icon Fix
echo ========================================
echo.

echo Step 1: Opening icon generator in your browser...
start "" "create-icons.html"

echo.
echo Step 2: Instructions:
echo 1. In the browser window that opened, click the download buttons for each icon size
echo 2. Save all 4 PNG files to the icons folder
echo 3. After downloading, come back here and press any key to continue
echo.

pause

echo.
echo Step 3: Checking if icons were created...
if exist "icons\icon16.png" (
    echo ✓ icon16.png found
) else (
    echo ✗ icon16.png missing
)

if exist "icons\icon32.png" (
    echo ✓ icon32.png found
) else (
    echo ✗ icon32.png missing
)

if exist "icons\icon48.png" (
    echo ✓ icon48.png found
) else (
    echo ✗ icon48.png missing
)

if exist "icons\icon128.png" (
    echo ✓ icon128.png found
) else (
    echo ✗ icon128.png missing
)

echo.
echo Step 4: Updating manifest.json to include icons...
echo.

REM Create a backup of the current manifest
copy manifest.json manifest.json.backup

REM Update manifest to include icons again
echo {> manifest.json
echo   "manifest_version": 3,>> manifest.json
echo   "name": "Network Monitor Pro",>> manifest.json
echo   "version": "1.0.0",>> manifest.json
echo   "description": "Advanced network monitoring extension with real-time packet analysis and device monitoring",>> manifest.json
echo   "permissions": [>> manifest.json
echo     "storage",>> manifest.json
echo     "tabs",>> manifest.json
echo     "webRequest",>> manifest.json
echo     "webRequestAuthProvider",>> manifest.json
echo     "system.network",>> manifest.json
echo     "background",>> manifest.json
echo     "activeTab">> manifest.json
echo   ],>> manifest.json
echo   "host_permissions": [>> manifest.json
echo     "<all_urls>",>> manifest.json
echo     "http://*/*",>> manifest.json
echo     "https://*/*">> manifest.json
echo   ],>> manifest.json
echo   "background": {>> manifest.json
echo     "service_worker": "background.js">> manifest.json
echo   },>> manifest.json
echo   "action": {>> manifest.json
echo     "default_popup": "popup.html",>> manifest.json
echo     "default_title": "Network Monitor Pro",>> manifest.json
echo     "default_icon": {>> manifest.json
echo       "16": "icons/icon16.png",>> manifest.json
echo       "32": "icons/icon32.png",>> manifest.json
echo       "48": "icons/icon48.png",>> manifest.json
echo       "128": "icons/icon128.png">> manifest.json
echo     }>> manifest.json
echo   },>> manifest.json
echo   "icons": {>> manifest.json
echo     "16": "icons/icon16.png",>> manifest.json
echo     "32": "icons/icon32.png",>> manifest.json
echo     "48": "icons/icon48.png",>> manifest.json
echo     "128": "icons/icon128.png">> manifest.json
echo   },>> manifest.json
echo   "content_scripts": [>> manifest.json
echo     {>> manifest.json
echo       "matches": ["<all_urls>"],>> manifest.json
echo       "js": ["content.js"],>> manifest.json
echo       "run_at": "document_start">> manifest.json
echo     }>> manifest.json
echo   ],>> manifest.json
echo   "web_accessible_resources": [>> manifest.json
echo     {>> manifest.json
echo       "resources": ["widget.html", "widget.js", "widget.css"],>> manifest.json
echo       "matches": ["<all_urls>"]>> manifest.json
echo     }>> manifest.json
echo   ]>> manifest.json
echo }>> manifest.json

echo ✓ manifest.json updated with icons
echo.

echo Step 5: Extension should now load successfully!
echo.
echo Next steps:
echo 1. Go to chrome://extensions/
echo 2. Click "Load unpacked" 
echo 3. Select this folder
echo 4. The extension should load without errors
echo.

echo Press any key to exit...
pause > nul 