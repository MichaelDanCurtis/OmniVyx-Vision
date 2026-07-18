mod presenter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(presenter::PresenterKernel::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            presenter::get_presenter_capabilities,
            presenter::accept_presenter_signal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
