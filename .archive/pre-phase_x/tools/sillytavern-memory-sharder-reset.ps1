# The reset helper wipes the selected host’s entire summary-sharder storage root. That is intentional and only appropriate for smoke-test cleanup.

# Use it like this for a clean test reset on SillyTavern:
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\chris\OneDrive\Documents\Personal\Projects\summary-sharder\tools\server-plugin\reset-interpretive-smoke-storage.ps1" -HostName "SillyTavern" -Force -RestartHost

# Then seed again:
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\chris\OneDrive\Documents\Personal\Projects\summary-sharder\tools\server-plugin\seed-interpretive-candidate.ps1" -HostName "SillyTavern" -Port 8000


# For clean future smoke runs on the default Jeep line, use:
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\chris\OneDrive\Documents\Personal\Projects\summary-sharder\tools\server-plugin\seed-interpretive-candidate.ps1" -HostName "SillyTavern" -Port 8000 -ResetFirst -RestartHostAfterReset

# Only use this if you intentionally want stacked dirty-state behavior:
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\chris\OneDrive\Documents\Personal\Projects\summary-sharder\tools\server-plugin\seed-interpretive-candidate.ps1" -HostName "SillyTavern" -Port 8000 -AllowDirtyDefaultLine