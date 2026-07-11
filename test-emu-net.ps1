$ErrorActionPreference = 'Continue'
Write-Host '--- curl from emulator to 10.0.2.2:3000 ---'
adb -s emulator-5554 shell "curl -s -m 5 -w 'HTTP=%{http_code} ERR=%{errormsg}' http://10.0.2.2:3000/health" 2>&1
Write-Host "`n--- curl from emulator to localhost:3000 ---"
adb -s emulator-5554 shell "curl -s -m 5 -w 'HTTP=%{http_code} ERR=%{errormsg}' http://localhost:3000/health" 2>&1
Write-Host "`n--- adb reverse tcp:3000 tcp:3000 ---"
adb -s emulator-5554 reverse tcp:3000 tcp:3000 2>&1
Write-Host "`n--- curl after reverse ---"
adb -s emulator-5554 shell "curl -s -m 5 -w 'HTTP=%{http_code} ERR=%{errormsg}' http://localhost:3000/health" 2>&1