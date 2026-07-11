$ErrorActionPreference = 'Continue'
Write-Host '--- check tools on emulator ---'
adb -s emulator-5554 shell "which curl wget nc busybox toybox 2>&1 | head -20"
Write-Host '--- aapt dump manifest (verify cleartext) ---'
$apk = 'C:\Users\ADMIN\Downloads\prm_prj\TradeLink\build\app\outputs\flutter-apk\app-release.apk'
$tmp = "$env:TEMP\manifest_check.txt"
& aapt dump xmltree $apk AndroidManifest.xml 2>&1 | Select-String -Pattern 'usesCleartextTraffic|application' | Select-Object -First 10
Write-Host '--- adb shell run-as (verify installed manifest) ---'
adb -s emulator-5554 shell "run-as com.tradelink.tradelink cat /data/data/com.tradelink.tradelink/AndroidManifest.xml 2>/dev/null | head -50" 2>&1 | Select-Object -First 30