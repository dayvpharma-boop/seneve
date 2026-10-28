#!/usr/bin/env bash
set -euo pipefail
mkdir -p build/cold-start
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
adb shell settings get global airplane_mode_on > build/cold-start/airplane-mode.txt
adb shell settings get global wifi_on > build/cold-start/wifi-state.txt
adb shell settings get global mobile_data > build/cold-start/data-state.txt
disconnected=0
for attempt in $(seq 1 30); do
  adb shell dumpsys connectivity > build/cold-start/connectivity.txt
  if grep -Eiq 'Active default network: (none|null|-1)' build/cold-start/connectivity.txt; then disconnected=1; break; fi
  sleep 1
done
if [ "$disconnected" != 1 ]; then echo 'Le réseau est encore actif : test hors connexion refusé.'; exit 1; fi
for pass in 1 2; do
  adb shell am force-stop org.seneve.mobile
  adb shell am start -W -n org.seneve.mobile/.MainActivity
  found=0
  for attempt in $(seq 1 20); do
    adb shell uiautomator dump /sdcard/seneve.xml >/dev/null 2>&1 || true
    adb pull /sdcard/seneve.xml "build/cold-start/start-$pass.xml" >/dev/null 2>&1 || true
    if grep -q '0.3-test' "build/cold-start/start-$pass.xml" 2>/dev/null; then found=1; break; fi
    sleep 3
  done
  adb exec-out screencap -p > "build/cold-start/start-$pass.png"
  adb shell dumpsys connectivity > "build/cold-start/network-$pass.txt"
  grep -Eiq 'Active default network: (none|null|-1)' "build/cold-start/network-$pass.txt"
  if [ "$found" != 1 ]; then
    adb logcat -d -s chromium Capacitor/Console AndroidRuntime > build/cold-start/error-log.txt
    echo "L’entrée HD et la version mobile manquent après démarrage hors réseau $pass."
    exit 1
  fi
done
echo "Deux démarrages à froid sans réseau conservent l’entrée HD 0.3-test."

