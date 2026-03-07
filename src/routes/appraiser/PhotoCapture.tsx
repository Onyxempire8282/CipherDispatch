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
import "./photo-capture.css";

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

  // Lock body scroll when camera is active
  useEffect(() => {
    if (cameraActive) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [cameraActive]);

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
      window.removeEventListener(
        "orientationchange",
        orientationHandlerRef.current
      );
      orientationHandlerRef.current = null;
    }
    setCameraActive(false);
    setVideoReady(false);
    setIsLandscape(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
          "image/jpeg",
          0.92
        )
      );

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }

      const activeSlots = getActiveSlots(state);
      const currentSlot = activeSlots[currentSlotIndex];

      if (!currentSlot) return;

      const url = URL.createObjectURL(blob);
      const photoId = crypto.randomUUID();

      const photo: CapturedPhoto = {
        id: photoId,
        slot_id: currentSlot.id,
        blob,
        url,
        uploaded: false,
      };

      setState((prev) => {
        const newPhotos = new Map(prev.captured_photos);
        const existing = newPhotos.get(currentSlot.id) || [];
        newPhotos.set(currentSlot.id, [...existing, photo]);
        return { ...prev, captured_photos: newPhotos };
      });

      uploadManager.addPhoto(currentSlot.id, blob);

      stopCamera();

      setTimeout(() => {
        const nextIndex = currentSlotIndex + 1;
        if (nextIndex < activeSlots.length) {
          setCurrentSlotIndex(nextIndex);
        }
      }, 300);
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
      .from("claims_v")
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
      <div className="capture">
        <div className="capture__inner capture__inner--narrow">
          <h2 className="capture__title capture__title--mb">
            Select Inspection Type
          </h2>

          <button
            onClick={() => selectInspectionType("regular")}
            className="capture__type-btn"
          >
            🚗 Regular Vehicle
          </button>

          <button
            onClick={() => selectInspectionType("heavy_duty")}
            className="capture__type-btn"
          >
            🚛 Heavy Duty / Commercial Vehicle
          </button>

          <button
            onClick={() => navigate(`/appraiser/claim/${claimId}`)}
            className="capture__back-btn"
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
      <div className="capture">
        <div className="capture__inner capture__inner--narrow">
          <h2 className="capture__title capture__title--mb">
            Manufacturer/Specialty Label
          </h2>
          <p className="capture__text">
            Is a manufacturer or specialty label present on this vehicle?
          </p>

          <button
            onClick={() => handleLabelResponse(true)}
            className="capture__type-btn"
          >
            Yes - Label Present
          </button>

          <button
            onClick={() => handleLabelResponse(false)}
            className="capture__type-btn"
          >
            No - No Label
          </button>
        </div>
      </div>
    );
  }

  // Main capture interface
  return (
    <div className="capture">
      <div className="capture__inner">
        {/* Header */}
        <div className="capture__card">
          <div className="capture__card-header">
            <div>
              <h2 className="capture__title">Photo Capture</h2>
              <p className="capture__subtitle">
                {state.inspection_type === "regular"
                  ? "🚗 Regular Vehicle"
                  : "🚛 Heavy Duty"}
              </p>
            </div>
            <div className="capture__progress">
              <div className="capture__progress-count">
                {progress.completed} / {progress.total}
              </div>
              <div className="capture__progress-label">
                photos complete
              </div>
            </div>
          </div>

          {/* Upload status */}
          {!uploadStatus.allComplete && (
            <div className="capture__upload-status capture__upload-status--uploading">
              ↑ Uploading {uploadStatus.uploading + uploadStatus.pending}{" "}
              photo(s) safely in background...
            </div>
          )}

          {uploadStatus.failed > 0 && (
            <div className="capture__upload-status capture__upload-status--failed">
              ⚠️ {uploadStatus.failed} photo(s) failed to upload. Check
              connection.
            </div>
          )}
        </div>

        {/* Conditional toggles */}
        <div className="capture__card">
          <h3 className="capture__card-title">
            Additional Sections (If Applicable)
          </h3>

          {["structural", "airbags", "tow_bill"].map((group) => (
            <label
              key={group}
              className="capture__toggle-label"
            >
              <input
                type="checkbox"
                checked={state.enabled_conditionals.has(group)}
                onChange={() => toggleConditional(group)}
                disabled={state.completed}
                className="capture__toggle-checkbox"
              />
              <span className="capture__toggle-text">
                {group === "structural" && "Structural Damage"}
                {group === "airbags" && "Airbags Deployed"}
                {group === "tow_bill" && "Tow Bill"}
              </span>
            </label>
          ))}
        </div>

        {/* Current slot */}
        {currentSlot && (
          <div className="capture__card capture__card--active-slot">
            <h3 className="capture__slot-title">
              {currentSlot.label}
              {currentSlot.required && (
                <span className="capture__required-mark"> *</span>
              )}
            </h3>
            <p className="capture__slot-instruction">
              {currentSlot.instruction}
            </p>

            {/* Captured photos for this slot */}
            {state.captured_photos.get(currentSlot.id)?.map((photo) => (
              <div
                key={photo.id}
                className="capture__photo-wrap"
              >
                <img
                  src={photo.url}
                  alt="Captured"
                  className="capture__photo-img"
                />
                {!state.completed && (
                  <button
                    onClick={() => retakePhoto(currentSlot.id, photo.id)}
                    className="capture__retake-btn"
                  >
                    🔄 Retake
                  </button>
                )}
              </div>
            ))}

            {/* Action buttons */}
            <div className="capture__actions">
              {!cameraActive && (
                <>
                  <button
                    onClick={startCamera}
                    disabled={state.completed}
                    className={`capture__capture-btn${state.completed ? " capture__capture-btn--disabled" : ""}`}
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
                        className="capture__next-btn"
                      >
                        Next →
                      </button>
                    )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Slot navigation */}
        <div className="capture__card">
          <h4 className="capture__slots-title">Photo Slots</h4>
          <div className="capture__slot-grid">
            {activeSlots.map((slot, idx) => {
              const captured = state.captured_photos.get(slot.id)?.length || 0;
              const isComplete = captured > 0;
              const isCurrent = idx === currentSlotIndex;

              return (
                <button
                  key={slot.id}
                  onClick={() => setCurrentSlotIndex(idx)}
                  className={`capture__slot-btn${isCurrent ? " capture__slot-btn--current" : isComplete ? " capture__slot-btn--complete" : ""}`}
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
          className={`capture__complete-btn${!canComplete || state.completed ? " capture__complete-btn--disabled" : ""}`}
        >
          {state.completed ? "✓ Inspection Completed" : "✓ Complete Inspection"}
        </button>

        <button
          onClick={() => navigate(`/appraiser/claim/${claimId}`)}
          className="capture__back-btn capture__back-btn--lg"
        >
          ← Back to Claim
        </button>
      </div>

      {/* Full-Screen Camera Capture Mode */}
      {cameraActive && (
        <div className="capture__camera-overlay">
          {/* Video fills entire viewport — dynamic sizing kept inline */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Next Photo Instruction Banner */}
          {(() => {
            const activeSlots = getActiveSlots(state);
            const nextIndex = currentSlotIndex + 1;
            const nextSlot = activeSlots[nextIndex];

            return nextSlot ? (
              <div className="capture__next-banner">
                Next: {nextSlot.label}
              </div>
            ) : null;
          })()}

          {/* Orientation Warning Overlay */}
          {videoReady && !isLandscape && (
            <div className="capture__orientation-warn">
              ⚠️ LANDSCAPE MODE REQUIRED
              <br />
              Rotate your device to landscape
            </div>
          )}

          {/* Cancel Button - Top Right */}
          <button
            onClick={stopCamera}
            className="capture__cancel-btn"
          >
            ✕
          </button>

          {/* Circular Shutter Button - Bottom Right */}
          <button
            onClick={capturePhoto}
            disabled={!videoReady || !isLandscape}
            className={`capture__shutter-btn${!videoReady || !isLandscape ? " capture__shutter-btn--disabled" : ""}`}
          >
            📷
          </button>
        </div>
      )}
    </div>
  );
}
