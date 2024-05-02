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
  const [videoTitle, setVideoTitle] = useState(""); // State to hold the video title
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("00:00");
  const [loading, setLoading] = useState(true); // State to handle the loading condition

  const timelineRef = useRef(null);
  const formatTime = (timeInSeconds) => {
    const pad = (num) => (num < 10 ? "0" + num : num);
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        generateThumbnails();
        updateSliderPosition(0);
      });
    }
  }, [videoURL]);

  const generateThumbnails = (videoSrc) => {
    const video = document.createElement("video");
    video.src = videoSrc;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;
      const interval = duration / 50; // More thumbnails for smoother transitions
      let currentTime = 0;

      const updateThumbnail = () => {
        if (currentTime <= duration) {
          const canvas = canvasRef.current;
          canvas.width = 120;
          canvas.height = 68;
          const context = canvas.getContext("2d");
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const newThumbnail = { src: canvas.toDataURL(), time: currentTime };
          setThumbnails((prevThumbnails) => [...prevThumbnails, newThumbnail]);

          currentTime += interval;
          video.currentTime = currentTime;
        } else {
          video.removeEventListener("seeked", updateThumbnail);
        }
      };

      video.addEventListener("seeked", updateThumbnail);
      video.currentTime = currentTime;
    });
  };

  const captureFrame = (time) => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) {
        console.error("Video element is not available");
        resolve(null);
        return;
      }
      // Log the intended seek time.
      console.log(`Seeking to time: ${time}`);

      const onSeeked = () => {
        console.log(
          `Video has seeked to time: ${videoRef.current.currentTime}`
        );
        try {
          if (!canvasRef.current) {
            console.error("Canvas element is not available");
            resolve(null);
            return;
          }
          const context = canvasRef.current.getContext("2d");
          context.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          const src = canvasRef.current.toDataURL("image/jpeg");
          videoRef.current.removeEventListener("seeked", onSeeked);
          resolve({ src, time });
        } catch (error) {
          console.error("Error capturing frame:", error);
          resolve(null);
        }
      };

      videoRef.current.addEventListener("seeked", onSeeked, { once: true });
      videoRef.current.currentTime = time; // Update currentTime after adding the event listener.
    });
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const url = URL.createObjectURL(file);
    setVideoURL(url);
    generateThumbnails(url);

    const formData = new FormData();
    formData.append("video", file);
    axios
      .post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .catch((error) => console.error("Error uploading video", error));
  };

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        generateThumbnails(videoRef.current.duration);
      });
    }
  }, [videoURL]);

  const onTimeUpdate = () => {
    if (!isDragging) {
      updateSliderPosition(videoRef.current.currentTime);
    }
  };

  const updateSliderPosition = (currentTime) => {
    if (timelineRef.current && videoRef.current) {
      const newPosition =
        (currentTime / videoRef.current.duration) *
        timelineRef.current.offsetWidth;
      setSliderPosition(newPosition);
    }
  };

  const handleMouseMove = (event) => {
    if (isDragging && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const newPosition = Math.max(
        0,
        Math.min(event.clientX - rect.left, rect.width)
      );
      const percentage = newPosition / rect.width;
      const newTime = percentage * videoRef.current.duration;
      setSliderPosition(newPosition);
      videoRef.current.currentTime = newTime;
    }
  };

  const handleMouseDown = (event) => {
    setIsDragging(true);
    handleMouseMove(event);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "video/*",
  });

  return (
    <div
      style={{
        background: "black",
        color: "white",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {!videoURL && (
        <div
          {...getRootProps()}
          style={{
            border: "2px dashed white",
            padding: 40,
            textAlign: "center",
            cursor: "pointer",
            width: "50%", // Ensuring it doesn't take full width
            marginBottom: "20px",
          }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the video here...</p>
          ) : (
            <p>
              Drag 'n' drop a video here, or click to select a video
              <FontAwesomeIcon icon={faFolderOpen} />
            </p>
          )}
        </div>
      )}
      {videoURL && (
        <div style={{ width: "50%" }}>
          {" "}
          {/* Container for video and thumbnails */}
          <video
            ref={videoRef}
            src={videoURL}
            //controls
            onTimeUpdate={onTimeUpdate}
            style={{
              display: "block",
              width: "100%",
              borderRadius: "8px", // Increased border radius
            }}
          />
          <div
            ref={timelineRef}
            style={{
              position: "relative",
              width: "100%",
              height: "45px",
              overflowX: "hidden",
              cursor: "pointer",
              marginTop: "20px",
              borderRadius: "8px", // Increased border radius
              display: "flex",
            }}
            onMouseDown={handleMouseDown}
          >
            {thumbnails.map((thumbnail, index) => (
              <div
                key={index}
                style={{
                  flex: "1 1 auto",
                  height: "100%",
                  position: "relative",
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
                top: "0",
                left: `${sliderPosition}px`,
                height: "90px",
                width: "5px",
                backgroundColor: "white",
                zIndex: 3,
              }}
            />
          </div>
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
