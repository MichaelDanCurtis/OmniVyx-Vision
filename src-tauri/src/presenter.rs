use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

pub struct PresenterKernel {
    next_sequence: Mutex<u64>,
}

impl Default for PresenterKernel {
    fn default() -> Self {
        Self {
            next_sequence: Mutex::new(1),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenterCapabilities {
    kernel_version: &'static str,
    app_version: &'static str,
    platform: &'static str,
    architecture: &'static str,
    native_shell: bool,
    subsystems: Vec<NativeSubsystem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeSubsystem {
    id: &'static str,
    status: &'static str,
    provider: &'static str,
    detail: &'static str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenterSignal {
    signal_id: String,
    show_id: String,
    kind: PresenterSignalKind,
    transcript: Option<String>,
    confidence: Option<f32>,
    occurred_at_ms: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PresenterSignalKind {
    TranscriptFinal,
    IntentCandidate,
    ManualCue,
    Hold,
    Resume,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenterReceipt {
    accepted: bool,
    sequence: u64,
    signal_id: String,
    show_id: String,
    kind: PresenterSignalKind,
    stage_channel: &'static str,
    occurred_at_ms: u64,
    has_transcript: bool,
    confidence: Option<f32>,
}

#[tauri::command]
pub fn get_presenter_capabilities() -> PresenterCapabilities {
    PresenterCapabilities {
        kernel_version: "presenter-kernel/0.1",
        app_version: env!("CARGO_PKG_VERSION"),
        platform: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
        native_shell: true,
        subsystems: vec![
            NativeSubsystem {
                id: "visual-stage",
                status: "ready",
                provider: "React Three Fiber",
                detail: "WebGL stage hosted by the native presenter window.",
            },
            NativeSubsystem {
                id: "speech-recognition",
                status: "planned",
                provider: "Apple SpeechAnalyzer",
                detail: "Native streaming transcription will attach at this boundary.",
            },
            NativeSubsystem {
                id: "semantic-engine",
                status: "planned",
                provider: "Local model slot",
                detail: "Intent candidates will be scored locally before show arbitration.",
            },
        ],
    }
}

#[tauri::command]
pub fn accept_presenter_signal(
    signal: PresenterSignal,
    kernel: State<'_, PresenterKernel>,
) -> Result<PresenterReceipt, String> {
    if signal.signal_id.trim().is_empty() {
        return Err("signalId is required".into());
    }
    if signal.show_id.trim().is_empty() {
        return Err("showId is required".into());
    }

    let mut next_sequence = kernel
        .next_sequence
        .lock()
        .map_err(|_| "presenter sequence lock is unavailable".to_string())?;
    let sequence = *next_sequence;
    *next_sequence += 1;

    Ok(PresenterReceipt {
        accepted: true,
        sequence,
        signal_id: signal.signal_id,
        show_id: signal.show_id,
        kind: signal.kind,
        stage_channel: "presenter.signal.accepted",
        occurred_at_ms: signal.occurred_at_ms,
        has_transcript: signal
            .transcript
            .as_ref()
            .is_some_and(|value| !value.trim().is_empty()),
        confidence: signal.confidence,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capabilities_expose_the_native_stage_and_future_local_slots() {
        let capabilities = get_presenter_capabilities();

        assert!(capabilities.native_shell);
        assert_eq!(capabilities.kernel_version, "presenter-kernel/0.1");
        assert_eq!(capabilities.subsystems[0].id, "visual-stage");
        assert_eq!(capabilities.subsystems[0].status, "ready");
        assert_eq!(capabilities.subsystems[1].id, "speech-recognition");
    }
}
