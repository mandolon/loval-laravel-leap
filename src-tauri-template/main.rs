// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    match handle.updater().check().await {
                        Ok(Some(update)) => {
                            let _ = update.download_and_install().await;
                        }
                        Ok(None) => {}
                        Err(_) => {}
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
