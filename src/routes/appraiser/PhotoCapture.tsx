import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  InspectionState,
  InspectionType,
  CapturedPhoto,
} from "../../types/photoCapture";
import {
  getActiveSlots,
  getCurrentSlot,
  canCompleteInspection,
  getProgressStats,
} from "../../utils/photoCapture";
import { uploadManager } from "../../utils/uploadManager";
import { PHOTO_SLOTS } from "../../config/photoSlots";

export default function PhotoCapture() {
  const { id: claimId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<InspectionState>({
    claim_id: claimId!,
    inspection_type: null,
    completed: false,
    enabled_conditionals: new Set<string>(),
    captured_photos: new Map(),
  });

  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({
    allComplete: true,
    uploading: 0,
    failed: 0,
    pending: 0,
  });
  const [showLabelPrompt, setShowLabelPrompt] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const orientationHandlerRef = useRef<(() => void) | null>(null);

  // Store claim ID and inspection type globally for upload manager
  useEffect(() => {
    (window as any).__current_claim_id = claimId;
    (window as any).__inspection_type = state.inspection_type;
  }, [claimId, state.inspection_type]);

  // Poll upload status
  useEffect(() => {
    const interval = setInterval(() => {
      setUploadStatus(uploadManager.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if inspection already started
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from("claim_photos")
        .select("inspection_type")
        .eq("claim_id", claimId)
        .limit(1)
        .single();

      if (data?.inspection_type) {
        setState((prev) => ({
          ...prev,
          inspection_type: data.inspection_type as InspectionType,
        }));
      }
    };

    checkExisting();
  }, [claimId]);

  const selectInspectionType = (type: InspectionType) => {
    setState((prev) => ({ ...prev, inspection_type: type }));

    // For regular vehicles, ask about manufacturer label
    if (type === "regular") {
      setShowLabelPrompt(true);
    }
  };

  const handleLabelResponse = (present: boolean) => {
    setState((prev) => ({
      ...prev,
      manufacturer_label_present: present,
    }));
    setShowLabelPrompt(false);
  };

  const toggleConditional = (group: string) => {
    setState((prev) => {
      const newConditionals = new Set(prev.enabled_conditionals);
      if (newConditionals.has(group)) {
        newConditionals.delete(group);
      } else {
        newConditionals.add(group);
      }
      return { ...prev, enabled_conditionals: newConditionals };
    });
  };

  // NOTE: iOS Safari reports unreliable video dimensions for orientation.
  // UI-level landscape detection must use window dimensions.
  const checkVideoOrientation = () => {
    if (videoRef.current) {
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width > 0 && height > 0) {
        setVideoReady(true);
        setIsLandscape(window.innerWidth > window.innerHeight);
      }
    }
  };

  // ⚠️ iOS Safari requires video element to be mounted
  // BEFORE attaching MediaStream and calling play().
  // Do NOT reorder this logic.

  const startCamera = async () => {
    try {
      setVideoReady(false);
      setIsLandscape(false);

      // STEP 1: Render the video element first
      setCameraActive(true);

      // STEP 2: Wait for React to commit the DOM
      requestAnimationFrame(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });

          streamRef.current = stream;

          const video = videoRef.current;
          if (!video) return;

          // iOS-required properties
          video.muted = true;
          video.playsInline = true;

          // Attach orientation handlers
          video.onloadedmetadata = () => {
            checkVideoOrientation();
          };

          video.onplaying = () => {
            if (!videoReady) {
              checkVideoOrientation();
            }
          };

          // Listen for device rotation
          const handleOrientationChange = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
          };
          orientationHandlerRef.current = handleOrientationChange;
          window.addEventListener("resize", handleOrientationChange);
          window.addEventListener("orientationchange", handleOrientationChange);

          // Attach stream and force playback
          video.srcObject = stream;
          await video.play();

          // Fallback in case events are delayed
          setTimeout(() => {
            if (!videoReady && video.videoWidth > 0) {
              checkVideoOrientation();
            }
          }, 500);
        } catch (err) {
          console.error("Camera stream error:", err);
        }
      });
    } catch (error) {
      console.error("Camera error:", error);
      alert("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onplaying = null;
    }
    if (orientationHandlerRef.current) {
      window.removeEventListener("resize", orientationHandlerRef.current);
      window.removeEventListener("orientationchange", orientationHandlerRef.current);
      orientationHandlerRef.current = null;
    }
    setCameraActive(false);
    setVideoReady(false);
    setIsLandscape(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) return;

    // Check orientation based on actual video dimensions
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    if (videoWidth <= videoHeight) {
      alert(
        "⚠️ LANDSCAPE MODE REQUIRED\n\nPlease rotate your device to landscape orientation to capture photos."
      );
      return;
    }

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const imageCapture = new ImageCapture(videoTrack);

      const blob = await imageCapture.takePhoto();

      // Validate dimensions
      const img = await createImageBitmap(blob);
      if (img.width <= img.height) {
        alert(
          "⚠️ LANDSCAPE MODE REQUIRED\n\nPhoto must be wider than it is tall. Please rotate your device."
        );
        return;
      }

      const activeSlots = getActiveSlots(state);
      const currentSlot = activeSlots[currentSlotIndex];

      if (!currentSlot) return;

      // Create local preview URL
      const url = URL.createObjectURL(blob);
      const photoId = crypto.randomUUID();

      const photo: CapturedPhoto = {
        id: photoId,
        slot_id: currentSlot.id,
        blob,
        url,
        uploaded: false,
      };

      // Update state
      setState((prev) => {
        const newPhotos = new Map(prev.captured_photos);
        const existing = newPhotos.get(currentSlot.id) || [];
        newPhotos.set(currentSlot.id, [...existing, photo]);
        return { ...prev, captured_photos: newPhotos };
      });

      // Upload in background
      uploadManager.addPhoto(currentSlot.id, blob);

      stopCamera();

      // Auto-advance if single photo slot
      if (currentSlot.max_photos === 1) {
        setTimeout(() => {
          const nextIndex = currentSlotIndex + 1;
          if (nextIndex < activeSlots.length) {
            setCurrentSlotIndex(nextIndex);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Capture error:", error);
      alert("Failed to capture photo. Please try again.");
    }
  };

  const retakePhoto = (slotId: string, photoId: string) => {
    if (state.completed) {
      alert("Inspection is completed. Photos are read-only.");
      return;
    }

    setState((prev) => {
      const newPhotos = new Map(prev.captured_photos);
      const existing = newPhotos.get(slotId) || [];
      const updated = existing.filter((p) => p.id !== photoId);

      if (updated.length > 0) {
        newPhotos.set(slotId, updated);
      } else {
        newPhotos.delete(slotId);
      }

      return { ...prev, captured_photos: newPhotos };
    });

    // Note: Original upload remains in background, but we remove from UI
    // Could add logic to delete from storage/DB if needed
  };

  const completeInspection = async () => {
    if (!canCompleteInspection(state)) {
      alert("Please complete all required photo slots before finishing.");
      return;
    }

    if (!uploadStatus.allComplete) {
      const confirm = window.confirm(
        `${
          uploadStatus.uploading + uploadStatus.pending
        } photos are still uploading.\n\n` +
          `They will continue uploading in the background.\n\n` +
          `Complete inspection now?`
      );
      if (!confirm) return;
    }

    setState((prev) => ({ ...prev, completed: true }));

    // Mark claim as having photos completed (optional - add field if needed)
    await supabase
      .from("claims")
      .update({ photos_completed: true })
      .eq("id", claimId);

    alert("✅ Inspection completed! All photos saved.");
    navigate(`/appraiser/claim/${claimId}`);
  };

  const activeSlots = getActiveSlots(state);
  const currentSlot = activeSlots[currentSlotIndex];
  const progress = getProgressStats(state);
  const canComplete = canCompleteInspection(state);

  // Inspection type selection
  if (!state.inspection_type) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#e2e8f0", marginBottom: 20 }}>
            Select Inspection Type
          </h2>

          <button
            onClick={() => selectInspectionType("regular")}
            style={{
              width: "100%",
              padding: 20,
              marginBottom: 15,
              background: "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🚗 Regular Vehicle
          </button>

          <button
            onClick={() => selectInspectionType("heavy_duty")}
            style={{
              width: "100%",
              padding: 20,
              background: "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🚛 Heavy Duty / Commercial Vehicle
          </button>

          <button
            onClick={() => navigate(`/appraiser/claim/${claimId}`)}
            style={{
              width: "100%",
              padding: 12,
              marginTop: 20,
              background: "#2d3748",
              color: "#e2e8f0",
              border: "1px solid #4a5568",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ← Back to Claim
          </button>
        </div>
      </div>
    );
  }

  // Manufacturer label prompt for regular vehicles
  if (showLabelPrompt) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#e2e8f0", marginBottom: 20 }}>
            Manufacturer/Specialty Label
          </h2>
          <p style={{ color: "#cbd5e0", marginBottom: 20 }}>
            Is a manufacturer or specialty label present on this vehicle?
          </p>

          <button
            onClick={() => handleLabelResponse(true)}
            style={{
              width: "100%",
              padding: 20,
              marginBottom: 15,
              background: "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            Yes - Label Present
          </button>

          <button
            onClick={() => handleLabelResponse(false)}
            style={{
              width: "100%",
              padding: 20,
              background: "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            No - No Label
          </button>
        </div>
      </div>
    );
  }

  // Main capture interface
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "#2d3748",
            border: "1px solid #4a5568",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: "#e2e8f0" }}>Photo Capture</h2>
              <p
                style={{ margin: "5px 0 0 0", color: "#cbd5e0", fontSize: 14 }}
              >
                {state.inspection_type === "regular"
                  ? "🚗 Regular Vehicle"
                  : "🚛 Heavy Duty"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ color: "#e2e8f0", fontSize: 20, fontWeight: "bold" }}
              >
                {progress.completed} / {progress.total}
              </div>
              <div style={{ color: "#cbd5e0", fontSize: 12 }}>
                photos complete
              </div>
            </div>
          </div>

          {/* Upload status */}
          {!uploadStatus.allComplete && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "#f59e0b",
                borderRadius: 6,
                color: "#1a202c",
                fontSize: 14,
              }}
            >
              ↑ Uploading {uploadStatus.uploading + uploadStatus.pending}{" "}
              photo(s) safely in background...
            </div>
          )}

          {uploadStatus.failed > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "#ef4444",
                borderRadius: 6,
                color: "white",
                fontSize: 14,
              }}
            >
              ⚠️ {uploadStatus.failed} photo(s) failed to upload. Check
              connection.
            </div>
          )}
        </div>

        {/* Conditional toggles */}
        <div
          style={{
            background: "#2d3748",
            border: "1px solid #4a5568",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h3 style={{ color: "#e2e8f0", fontSize: 16, marginTop: 0 }}>
            Additional Sections (If Applicable)
          </h3>

          {["structural", "airbags", "tow_bill"].map((group) => (
            <label
              key={group}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={state.enabled_conditionals.has(group)}
                onChange={() => toggleConditional(group)}
                disabled={state.completed}
                style={{ marginRight: 10, width: 20, height: 20 }}
              />
              <span style={{ color: "#e2e8f0" }}>
                {group === "structural" && "Structural Damage"}
                {group === "airbags" && "Airbags Deployed"}
                {group === "tow_bill" && "Tow Bill"}
              </span>
            </label>
          ))}
        </div>

        {/* Current slot */}
        {currentSlot && (
          <div
            style={{
              background: "#2d3748",
              border: "2px solid #667eea",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h3 style={{ color: "#e2e8f0", marginTop: 0 }}>
              {currentSlot.label}
              {currentSlot.required && (
                <span style={{ color: "#ef4444" }}> *</span>
              )}
            </h3>
            <p style={{ color: "#cbd5e0", marginBottom: 20 }}>
              {currentSlot.instruction}
            </p>

            {/* Captured photos for this slot */}
            {state.captured_photos.get(currentSlot.id)?.map((photo) => (
              <div
                key={photo.id}
                style={{ marginBottom: 15, position: "relative" }}
              >
                <img
                  src={photo.url}
                  alt="Captured"
                  style={{ width: "100%", borderRadius: 8 }}
                />
                {!state.completed && (
                  <button
                    onClick={() => retakePhoto(currentSlot.id, photo.id)}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      padding: "8px 16px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    🔄 Retake
                  </button>
                )}
              </div>
            ))}

            {/* Camera view */}
            {cameraActive && (
              <div style={{ marginBottom: 15 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", borderRadius: 8, background: "#000" }}
                />
                {videoReady && !isLandscape && (
                  <div
                    style={{
                      padding: 12,
                      background: "#f59e0b",
                      borderRadius: 6,
                      marginTop: 10,
                      color: "#1a202c",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ LANDSCAPE MODE REQUIRED - Rotate your device to landscape
                  </div>
                )}
                {videoReady && isLandscape && (
                  <div
                    style={{
                      padding: 12,
                      background: "#10b981",
                      borderRadius: 6,
                      marginTop: 10,
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    ✓ Ready to capture - Device is in landscape mode
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {!cameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    disabled={state.completed}
                    style={{
                      flex: 1,
                      padding: 15,
                      background: state.completed ? "#4a5568" : "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 18,
                      fontWeight: "bold",
                      cursor: state.completed ? "not-allowed" : "pointer",
                    }}
                  >
                    📷 Capture Photo
                  </button>
                  {currentSlot.max_photos === -1 &&
                    state.captured_photos.get(currentSlot.id)?.length > 0 && (
                      <button
                        onClick={() => {
                          const nextIndex = currentSlotIndex + 1;
                          if (nextIndex < activeSlots.length) {
                            setCurrentSlotIndex(nextIndex);
                          }
                        }}
                        style={{
                          padding: 15,
                          background: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        Next →
                      </button>
                    )}
                </>
              ) : (
                <>
                  <button
                    onClick={capturePhoto}
                    disabled={!videoReady || !isLandscape}
                    style={{
                      flex: 1,
                      padding: 15,
                      background:
                        videoReady && isLandscape ? "#10b981" : "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 18,
                      fontWeight: "bold",
                      cursor:
                        videoReady && isLandscape ? "pointer" : "not-allowed",
                      opacity: videoReady && isLandscape ? 1 : 0.6,
                    }}
                  >
                    ✓ Take Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{
                      padding: 15,
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Slot navigation */}
        <div
          style={{
            background: "#2d3748",
            border: "1px solid #4a5568",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h4 style={{ color: "#e2e8f0", marginTop: 0 }}>Photo Slots</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
              gap: 10,
            }}
          >
            {activeSlots.map((slot, idx) => {
              const captured = state.captured_photos.get(slot.id)?.length || 0;
              const isComplete = captured > 0;
              const isCurrent = idx === currentSlotIndex;

              return (
                <button
                  key={slot.id}
                  onClick={() => setCurrentSlotIndex(idx)}
                  style={{
                    padding: 10,
                    background: isCurrent
                      ? "#667eea"
                      : isComplete
                      ? "#10b981"
                      : "#4a5568",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {idx + 1}
                  {isComplete && " ✓"}
                  {slot.required && " *"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Complete button */}
        <button
          onClick={completeInspection}
          disabled={!canComplete || state.completed}
          style={{
            width: "100%",
            padding: 20,
            background: canComplete && !state.completed ? "#10b981" : "#4a5568",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 20,
            fontWeight: "bold",
            cursor: canComplete && !state.completed ? "pointer" : "not-allowed",
            marginBottom: 20,
          }}
        >
          {state.completed ? "✓ Inspection Completed" : "✓ Complete Inspection"}
        </button>

        <button
          onClick={() => navigate(`/appraiser/claim/${claimId}`)}
          style={{
            width: "100%",
            padding: 15,
            background: "#2d3748",
            color: "#e2e8f0",
            border: "1px solid #4a5568",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          ← Back to Claim
        </button>
      </div>
    </div>
  );
}
