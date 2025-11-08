# How Auto-Update Actually Triggers - Code Deep Dive

## The Tauri Updater Code Flow

### 1. App Startup (Where Update Check Happens)

In `src-tauri/src/main.rs`:

```rust
#[tauri::command]
async fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let app_handle = app.handle().clone();
      
      // This runs when app starts
      tauri::async_runtime::spawn(async move {
        let _ = app_handle.updater()
          .check()          // Check for updates
          .await;           // Wait for response
      });
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

What this does:
```
App launches
  ↓
Setup runs
  ↓
Spawns async task
  ↓
Calls updater.check()
  ↓
Checks endpoint
  ↓
If newer version found → Dialog appears automatically
```

### 2. The Configuration (tauri.conf.json)

```json
{
  "plugins": {
    "updater": {
      "active": true,           // Enable updater
      "dialog": true,           // Show UI dialog (AUTOMATIC!)
      "endpoints": [
        "https://github.com/mandolon/app.rehome/releases/download/latest/latest.json"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."  // Signature verification
    }
  }
}
```

This means:
- ✅ Auto-update is enabled
- ✅ UI dialog shows automatically (you don't code it)
- ✅ No button click needed to trigger check
- ✅ Happens silently on app startup

### 3. The Update Dialog (Automatically Shown)

Because `"dialog": true`, Tauri automatically shows this dialog:

```tsx
// Tauri shows this automatically - you don't need to code it
Dialog {
  title: "Update Available",
  message: "Version 1.0.1 is now available",
  buttons: ["Cancel", "Install Update"],
  notes: "..." // From latest.json
}
```

### 4. When User Clicks "Install Update"

```rust
// Tauri automatically:
1. Downloads MSI from URL in latest.json
2. Verifies signature with pubkey
3. Runs installer silently
4. Waits for completion
5. Calls app.restart()
6. App restarts with new version
```

---

## Complete Example: What Happens Step By Step

### Step 1: User Launches App v1.0.0

```
Application.exe v1.0.0 starts
        │
        └─ main.rs setup() runs
           │
           └─ updater.check() triggers
              (asynchronously, doesn't block app)
```

### Step 2: App Checks Endpoint

```
HTTP GET: https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

Response (200 OK):
{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project fixes, ...",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6bWluaXNpZ24gcHVibGljIGtleTog...",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

### Step 3: Version Comparison

```rust
// In Tauri updater code:
let local_version = "1.0.0";      // App currently running
let remote_version = "1.0.1";     // From latest.json

if remote_version > local_version {
    // Update available!
    show_update_dialog()  // Automatically shows UI
}
```

### Step 4: Dialog Appears

```
User sees:
┌──────────────────────────────────────────┐
│ Update Available                         │
│                                          │
│ Version 1.0.1 is now available.         │
│ Would you like to install it now?       │
│                                          │
│ Release notes:                           │
│ • Onboarding wizard                      │
│ • Project visibility fixes               │
│ • Excalidraw improvements                │
│                                          │
│ [Cancel]           [Install Update]     │
└──────────────────────────────────────────┘

User clicks: "Install Update"
```

### Step 5: Download & Install

```rust
// Tauri automatically:

1. download_msi()
   GET https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi
   → Saves to temp folder
   → Shows progress (█████████░░░)

2. verify_signature()
   Check: signature in latest.json
   Against: pubkey in tauri.conf.json
   → Security check passes

3. run_installer()
   → Execute: rehome_1.0.1_x64_en-US.msi
   → Silent mode (InstallMode: passive)
   → Extracts to Program Files
   → Replaces old files

4. restart_app()
   → Close current app (v1.0.0)
   → Launch new executable (v1.0.1)
   → User back in app with new version!
```

---

## Network Request/Response

### Request From App to GitHub

```http
GET /mandolon/app.rehome/releases/download/latest/latest.json HTTP/1.1
Host: github.com
User-Agent: Tauri Updater (Windows)
Accept: application/json
Connection: close
```

### Response From GitHub

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 487
Cache-Control: public, max-age=60

{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project visibility fixes, and Excalidraw customizations",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRCNTRFRENFNDU1QUEwNzAKUldSd29GcEZ6dTFVUzJ5YnhZcklhVGpMSEZHQnVNbXVDaitwSk1DVyt3aXJIMG41OTRXTW1jWlVtCg==",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

---

## File Locations & Sizes

### After Build (On Developer Machine)

```
F:\loval-laravel-leap\
  src-tauri\target\release\
    rehome_1.0.1_x64_en-US.msi  ← 50-100 MB (compiled binary)
```

### After Release (On GitHub)

```
github.com/mandolon/app.rehome/releases/v1.0.1/
  ├─ rehome_1.0.1_x64_en-US.msi  (50-100 MB)
  └─ latest.json                 (1-2 KB)

Also available at:
  releases/download/latest/latest.json
  ↑ This is what app checks
```

### After Installation (On User's Machine)

```
C:\Program Files\rehome\
  ├─ rehome.exe          (new v1.0.1)
  ├─ resources\
  │  ├─ app.html
  │  └─ ...
  └─ ... (all new files from v1.0.1)
```

---

## Why "dialog: true" is Important

### With "dialog": true (Current Config)

```json
"updater": {
  "dialog": true  ← Automatic UI
}
```

Result:
- App starts
- Check runs silently
- Update found
- Dialog appears automatically
- User clicks button
- Install happens

User experience: Simple! Just sees dialog and clicks button.

### With "dialog": false (Alternative)

```json
"updater": {
  "dialog": false  ← No automatic dialog
}
```

You would need to write your own dialog code:

```tsx
// In React component (you have to build this)
import { check } from '@tauri-apps/plugin-updater'

function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  
  useEffect(() => {
    check().then(update => {
      if (update) setUpdateAvailable(true)
    })
  }, [])
  
  if (!updateAvailable) return null
  
  return (
    <div className="update-dialog">
      <h2>Update Available</h2>
      <button onClick={() => update.downloadAndInstall()}>
        Install Now
      </button>
    </div>
  )
}
```

Current setup uses automatic dialog (much simpler!).

---

## Timeline: From Now Until User Gets Update

```
Day 1 - Today
├─ Code pushed to GitHub ✅
└─ Version: 1.0.0 (users have this)

Day 1 - Tomorrow
├─ Run: npm run build:tauri
│  (creates MSI binary)
│
├─ Create GitHub release v1.0.1
│
├─ Upload: rehome_1.0.1_x64_en-US.msi
│  (to release)
│
└─ Upload: latest.json
   (to release)
   │
   └─ Update endpoint now serves v1.0.1

Day 2
├─ User launches app v1.0.0
│
├─ App checks:
│  GET latest.json
│  Response: v1.0.1 available
│
├─ Dialog appears:
│  "Update available - install now?"
│
├─ User clicks: "Install Update"
│
├─ App auto-downloads MSI (~5-15 sec)
│
├─ MSI auto-installs (~30-60 sec)
│
├─ App auto-restarts
│
└─ User has v1.0.1 ✅
   (Onboarding wizard active!)
   (Project filtering works!)
   (All new features available!)
```

---

## What Happens If latest.json Isn't Updated

### Scenario: MSI uploaded, latest.json NOT updated

```
User launches app v1.0.0
        │
        └─ App checks: latest.json
           │
           └─ Response: "version": "1.0.0"
              (hasn't been updated yet!)
              │
              └─ Comparison:
                 Remote: 1.0.0
                 Local:  1.0.0
                 Same version → No update available
                 │
                 └─ No dialog shown
                 └─ User doesn't know new version exists
                 └─ MSI sits in GitHub unused
```

**Solution**: Update latest.json too!

### Scenario: Both MSI and latest.json uploaded

```
User launches app v1.0.0
        │
        └─ App checks: latest.json
           │
           └─ Response: "version": "1.0.1"
              │
              └─ Comparison:
                 Remote: 1.0.1
                 Local:  1.0.0
                 1.0.1 > 1.0.0 → Update available ✓
                 │
                 └─ Dialog shown
                 └─ User sees update
                 └─ User can click install
                 └─ Auto-update works! ✅
```

---

## The Minimum Files Needed

To enable auto-update for users:

### On GitHub Releases (v1.0.1)

```
Required Files:
├─ rehome_1.0.1_x64_en-US.msi (the binary - compiled code)
└─ latest.json (the manifest - tells app about update)

Both uploaded to: /releases/v1.0.1/
Available at: /releases/latest/ (symlink)
```

### In Your Code (src-tauri/)

```
Required:
├─ tauri.conf.json (has updater config)
├─ src/main.rs (has setup code)
└─ Cargo.toml (has updater plugin)

These already exist! ✅
```

---

## Summary: The 3-Piece System

```
1. MSI FILE
   └─ Compiled binary that users download & install
   └─ Created by: npm run build:tauri
   └─ Location: src-tauri/target/release/rehome_1.0.1_x64_en-US.msi

2. MANIFEST FILE (latest.json)
   └─ Tells app about the update
   └─ Contains: version, download URL, signature
   └─ Created by: You (manual JSON file)

3. CONFIG FILE (tauri.conf.json)
   └─ Tells app where to check & how to behave
   └─ Contains: endpoint URL, dialog: true
   └─ Already configured! ✅
```

All three together = Auto-update works!

```
app.exe (running on user computer)
  │
  ├─ Reads: tauri.conf.json
  │  "Check for updates at: github.com/.../latest/latest.json"
  │
  └─ Fetches: latest.json (from GitHub)
     │
     ├─ Reads: "version": "1.0.1"
     │
     ├─ Compares with: app version 1.0.0
     │
     ├─ Sees: 1.0.1 > 1.0.0
     │
     └─ Shows dialog (automatic!)
        "Update available"
        User clicks → Downloads MSI → Installs → Done! ✅
```

