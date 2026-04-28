mod adapters;
mod application;
mod domain;
mod ports;

use adapters::{
    session_registry::AppState,
    storage_state::StorageState,
    tauri::commands::{
        cancel_agent_run, clear_acp_session, close_workbench_window, create_saved_prompt,
        delete_saved_prompt, detach_tab, get_window_bootstrap, list_acp_sessions, list_agents,
        list_saved_prompts, list_workbench_windows, load_goal_file, open_workbench_window,
        record_saved_prompt_used, respond_agent_permission, send_prompt_to_run, start_agent_run,
        transfer_run_owner, update_saved_prompt,
    },
};
use domain::workbench_window::{WorkbenchWindowCloseRequest, should_confirm_last_window_close};
use tauri::{Emitter, Manager};

const WORKBENCH_WINDOW_CLOSE_REQUESTED_EVENT: &str = "workbench-window-close-requested";

pub fn run() {
    let app_state = AppState::default();
    let cleanup_state = app_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let storage = tauri::async_runtime::block_on(StorageState::open(app_data_dir))?;
            app.manage(storage);
            Ok(())
        })
        .on_window_event(move |window, event| {
            let label = window.label().to_string();
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let state = cleanup_state.clone();
                    let approved =
                        tauri::async_runtime::block_on(state.take_window_close_approval(&label));
                    let owned_runs = tauri::async_runtime::block_on(state.runs_owned_by(&label));
                    let last_window = should_confirm_last_window_close(
                        &label,
                        window.app_handle().webview_windows().len(),
                    );
                    if !approved && (!owned_runs.is_empty() || last_window) {
                        api.prevent_close();
                        let _ = window.emit(
                            WORKBENCH_WINDOW_CLOSE_REQUESTED_EVENT,
                            WorkbenchWindowCloseRequest::new(owned_runs.len(), last_window),
                        );
                    }
                }
                tauri::WindowEvent::Destroyed => {
                    let state = cleanup_state.clone();
                    tauri::async_runtime::spawn(async move {
                        state.cancel_runs_owned_by(&label).await;
                    });
                }
                _ => {}
            }
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            list_agents,
            load_goal_file,
            get_window_bootstrap,
            list_workbench_windows,
            open_workbench_window,
            close_workbench_window,
            detach_tab,
            start_agent_run,
            send_prompt_to_run,
            cancel_agent_run,
            transfer_run_owner,
            respond_agent_permission,
            list_acp_sessions,
            clear_acp_session,
            list_saved_prompts,
            create_saved_prompt,
            update_saved_prompt,
            delete_saved_prompt,
            record_saved_prompt_used
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
