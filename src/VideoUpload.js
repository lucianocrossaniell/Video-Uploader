import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

function VideoUpload() {
  const [videoURL, setVideoURL] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("00:00");
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState("");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(null);
  const [leftHandlePosition, setLeftHandlePosition] = useState(0);
  const [rightHandlePosition, setRightHandlePosition] = useState(0);
  const leftHandleRef = useRef(null);
  const rightHandleRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true); // Assume video starts paused
  const [loadingPercentage, setLoadingPercentage] = useState(0);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  // Add touch handlers similar to mouse events for mobile support
  const handleTouchStart = (event) => {
    event.preventDefault(); // Prevent scrolling when you start touching
    const touchX = event.touches[0].clientX;
    handleMouseDown({ clientX: touchX });
  };

  const handleTouchMove = (event) => {
    const touchX = event.touches[0].clientX;
    handleMouseMove({ clientX: touchX });
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === "Space" && videoRef.current) {
        event.preventDefault(); // Prevent scrolling
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPaused(false);
        } else {
          videoRef.current.pause();
          setIsPaused(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (videoURL && videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        video.play(); // Autoplay the video
        generateThumbnails(video.duration);
        updateSliderPosition(0);
        setTrimEnd(video.duration);
      };
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () =>
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [videoURL]);

  useEffect(() => {
    document.body.style.backgroundColor = "black";
    document.body.style.color = "white";
    return () => {
      document.body.style.backgroundColor = null;
      document.body.style.color = null;
    };
  }, []);

  const generateThumbnails = (duration) => {
    const video = document.createElement("video");
    video.src = videoURL;
    video.muted = true; // Ensure the video is muted to allow autoplay on iOS
    video.playsInline = true; // Ensures inline playback on iOS devices

    video.addEventListener("loadedmetadata", () => {
      const interval = duration / 20;
      let currentTime = 0;
      const updateThumbnail = () => {
        if (currentTime > duration) {
          video.removeEventListener("seeked", updateThumbnail);
          setLoading(false);
          console.log("Thumbnails generation completed.");
          return;
        }
        const canvas = canvasRef.current;
        canvas.width = 80; // Reduced size
        canvas.height = 45;
        const context = canvas.getContext("2d");

        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const newThumbnail = { src: canvas.toDataURL(), time: currentTime };
          setThumbnails((prevThumbnails) => [...prevThumbnails, newThumbnail]);
        } catch (error) {
          console.error("Error drawing on canvas: ", error);
        }

        currentTime += interval;
        video.currentTime = currentTime;
      };

      video.addEventListener("seeked", updateThumbnail);
      video.currentTime = currentTime;
    });

    video.addEventListener("error", (e) => {
      console.error("Error with video element: ", e);
    });
  };

  const onDrop = (acceptedFiles) => {
    handleFileSelect(acceptedFiles[0]);
  };

  const onTimeUpdate = () => {
    if (!isDragging) {
      const currentTime = videoRef.current.currentTime;
      if (currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart; // Reset to start position
      }
      updateSliderPosition(currentTime);
    }
  };

  const updateSliderPosition = (currentTime) => {
    if (timelineRef.current && videoRef.current) {
      const newPosition =
        (currentTime / videoRef.current.duration) *
        timelineRef.current.offsetWidth;
      setSliderPosition(newPosition);
      setCurrentTimeDisplay(formatTime(currentTime));
    }
  };

  const formatTime = (timeInSeconds) => {
    const pad = (num) => (num < 10 ? "0" + num : num);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleMouseDown = (event) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    // Check if click is closer to the left handle
    if (Math.abs(x - leftHandlePosition) < 10) {
      setIsDragging("left");
    } else if (Math.abs(x - rightHandlePosition) < 10) {
      // Check if click is closer to the right handle
      setIsDragging("right");
    }
  };

  useEffect(() => {
    if (videoRef.current && timelineRef.current) {
      const totalWidth = timelineRef.current.offsetWidth;
      setLeftHandlePosition(
        (trimStart / videoRef.current.duration) * totalWidth
      );
      setRightHandlePosition(
        (trimEnd / videoRef.current.duration) * totalWidth
      );
    }
  }, [trimStart, trimEnd, videoRef.current]);

  const handleMouseMove = (event) => {
    if (!isDragging || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const newPosition = Math.max(
      0,
      Math.min(event.clientX - rect.left, rect.width)
    );

    if (isDragging === "left") {
      const newTrimStart =
        (newPosition / rect.width) * videoRef.current.duration;
      setTrimStart(newTrimStart);
      setLeftHandlePosition(newPosition);
    } else if (isDragging === "right") {
      const newTrimEnd = (newPosition / rect.width) * videoRef.current.duration;
      setTrimEnd(newTrimEnd);
      setRightHandlePosition(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "video/*",
  });

  const calculatePosition = (time) => {
    if (videoRef.current && videoRef.current.duration) {
      return (time / videoRef.current.duration) * 100;
    }
    return 0;
  };

  const handleTimelineClick = (event) => {
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPositionX = event.clientX - rect.left; // Get the horizontal position of the click relative to the timeline
    const positionRatio = clickPositionX / rect.width; // Calculate the ratio of the click position to the total width
    const newTime = positionRatio * videoRef.current.duration; // Calculate the new time based on the duration of the video

    if (newTime >= trimStart && newTime <= trimEnd) {
      videoRef.current.currentTime = newTime; // Set the video's current time
      updateSliderPosition(newTime); // Update the slider position
    }
  };

  const handleFileSelect = (file) => {
    const url = URL.createObjectURL(file);
    console.log("Handling file select:", url);
    setVideoURL(url);
    setFileName(file.name);
    uploadVideo(file);
  };

  const uploadVideo = (file) => {
    // Create an instance of FormData
    const formData = new FormData();

    // Append the file named 'video' (this name should match the expected field on your server)
    formData.append("video", file);

    // Use Axios to send a POST request to your server endpoint
    axios
      .post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        console.log("Video uploaded successfully:", response);
      })
      .catch((error) => {
        console.error("Error uploading video:", error);
      });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("video")) {
      const url = URL.createObjectURL(file);
      setVideoURL(url);
      setFileName(file.name);
      setThumbnails([]); // Reset thumbnails for new video
      updateVideo(file);
    }
  };

  const updateVideo = (file) => {
    const formData = new FormData();
    formData.append("video", file);

    axios
      .post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        console.log("Video uploaded successfully");
      })
      .catch((error) => {
        console.error("Error uploading video", error);
      });
  };

  const triggerFileSelectPopup = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      ref={timelineRef}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh", // Use viewport height to take full height of the screen
        width: "100%", // Full width
        backgroundColor: "black",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTimelineClick} // Add click handler here
    >
      {!videoURL && (
        <div
          {...getRootProps()}
          style={{
            // border: "2px dashed white",
            bacgkround: "grey",
            padding: 40,
            textAlign: "center",
            cursor: "pointer",

            background: "#171717",
            borderRadius: "24px",
          }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the video here...</p>
          ) : (
            <>
              <FontAwesomeIcon icon={faFolderOpen} />
              <br />
              <p> Open video</p>
            </>
          )}
        </div>
      )}

      {videoURL && (
        <div style={{ width: "100%", maxWidth: "800px", margin: "auto" }}>
          <div
            onClick={triggerFileSelectPopup}
            style={{
              cursor: "pointer",
              marginTop: "20px",
              color: "white",
              paddingBottom: "20px",
            }}
          >
            {fileName || "Click here to select another video"}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            accept="video/*"
            onChange={handleFileChange}
          />

          <video
            ref={videoRef}
            src={videoURL}
            playsInline
            muted={true}
            onTimeUpdate={onTimeUpdate}
            loop
            style={{ display: "block", width: "100%", borderRadius: "35px" }}
            onLoadedData={() => console.log("Video is loaded and can play!")}
            onError={() => console.log("Error loading the video")}
          />
          <div
            style={{
              borderRadius: "10px",
              marginTop: "60px",
            }}
          >
            <div
              ref={timelineRef}
              style={{
                position: "relative",
                width: "100%",
                height: "45px",
                cursor: "pointer",
                borderRadius: "8px",
                display: "flex",
              }}
              onMouseDown={handleMouseDown}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${calculatePosition(trimStart)}%`,
                  right: `${100 - calculatePosition(trimEnd)}%`,
                  top: 0,
                  bottom: 0,
                  border: "solid 1px",
                  // backgroundColor: "rgba(255, 255, 255, 0.5)", // Semi-transparent white for visibility
                  zIndex: 2, // Ensure it's above the thumbnails but below other controls
                }}
              />
              {thumbnails.map((thumbnail, index) => (
                <div
                  key={index}
                  style={{
                    flex: "1 1 auto",
                    height: "100%",
                    position: "relative",
                    // Apply lower opacity if outside the trim range
                    opacity:
                      thumbnail.time < trimStart || thumbnail.time > trimEnd
                        ? 0.2
                        : 1,
                  }}
                >
                  <img
                    src={thumbnail.src}
                    alt={`Thumbnail ${index}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                    onClick={() =>
                      (videoRef.current.currentTime = thumbnail.time)
                    }
                  />
                </div>
              ))}

              <div
                style={{
                  position: "absolute",
                  left: `${calculatePosition(trimStart)}%`,
                  right: `${100 - calculatePosition(trimEnd)}%`,
                  top: 0,
                  bottom: 0,

                  zIndex: 2,
                }}
              ></div>
              <div
                style={{
                  position: "absolute",
                  left: `${leftHandlePosition - 15}px`,
                  height: "100%",
                  width: "15px",
                  backgroundColor: "white",
                  borderRadius: " 15px 0 0 15px  ",
                  cursor: "ew-resize",
                  zIndex: 10,
                }}
              />
              {/* Right Handle for End Time */}

              <div
                style={{
                  position: "absolute",
                  left: `${rightHandlePosition}px`,
                  height: "100%",
                  width: "15px",
                  backgroundColor: "white",
                  cursor: "ew-resize",
                  zIndex: 10,
                  borderRadius: "0 15px 15px 0",
                }}
              />
              <p
                style={{
                  position: "absolute",
                  background: "white",
                  color: "black",
                  border: "10px",
                  left: `${sliderPosition - 40}px`,
                  top: "-60px",
                  padding: "5px 20px",
                  borderRadius: "40px",
                }}
              >
                {currentTimeDisplay}
              </p>
              <div
                style={{
                  position: "absolute",
                  left: `${sliderPosition}px`,
                  height: "59px",
                  width: "5px",
                  backgroundColor: "white",
                  zIndex: 3,
                  borderRadius: "50px",
                  top: "-6px",
                }}
              ></div>
            </div>
          </div>
          <p>press spacebar to pause/play video</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
        width="160"
        height="90"
      />
    </div>
  );
}

export default VideoUpload;
