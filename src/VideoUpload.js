import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";

function VideoUpload() {
  const [videoURL, setVideoURL] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [playTime, setPlayTime] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        generateThumbnails();
        updateSliderPosition(0); // Initialize the slider at the start when metadata is loaded
      });
    }
  }, [videoURL]);

  const generateThumbnails = () => {
    const numThumbnails = 50; // Adjust the number of thumbnails based on your needs
    const duration = videoRef.current.duration;
    let tempThumbnails = [];
    let count = 0; // Counter to track when all thumbnails have been processed

    const captureFrame = (time, index) => {
      videoRef.current.currentTime = time;
      videoRef.current.addEventListener(
        "seeked",
        function onSeeked() {
          const canvas = canvasRef.current;
          const context = canvas.getContext("2d");
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
          tempThumbnails[index] = {
            src: canvas.toDataURL("image/jpeg"),
            time: time,
          };
          count++;
          if (count === numThumbnails) {
            // Ensure we sort by time in case the 'seeked' events finish out of order
            setThumbnails(tempThumbnails.sort((a, b) => a.time - b.time));
          }
          videoRef.current.removeEventListener("seeked", onSeeked);
        },
        { once: true }
      );
    };

    for (let i = 0; i < numThumbnails; i++) {
      const time = duration * (i / (numThumbnails - 1)); // Ensure the last thumbnail is at the very end
      captureFrame(time, i);
    }
  };

  const calculateThumbnailOpacity = (index) => {
    const currentIndex = Math.round(
      sliderPosition / (timelineRef.current.offsetWidth / thumbnails.length)
    );
    const distance = Math.abs(index - currentIndex);
    if (distance > 3) {
      return 0.1;
    }
    return 1 - (distance / 3) * 0.9; // From 1 to 0.1 within 3 frames
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const url = URL.createObjectURL(file);
    setVideoURL(url);
    updateSliderPosition(0); // Reset slider to the beginning when a new video is loaded
  };

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

  // Handle mouse events for dragging the slider
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
    handleMouseMove(event); // Update immediately on click
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
      style={{ background: "black", color: "white", padding: "10px" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {videoURL && (
        <div>
          <video
            ref={videoRef}
            src={videoURL}
            width="100%"
            controls
            onTimeUpdate={onTimeUpdate}
            style={{ display: "block", margin: "auto", background: "black" }}
          />
          <div
            ref={timelineRef}
            className="timeline"
            style={{
              position: "relative",
              width: "100%",
              height: "90px",
              overflowX: "hidden",
              cursor: "pointer",
              marginTop: "20px",
            }}
            onMouseDown={handleMouseDown}
          >
            {thumbnails.map((thumbnail, index) => (
              <img
                key={index}
                src={thumbnail.src}
                alt={`Thumbnail ${index}`}
                style={{
                  position: "absolute",
                  width: `${100 / thumbnails.length}%`, // Ensure thumbnails cover 100% of the width
                  height: "90px",
                  left: `${(100 / thumbnails.length) * index}%`,
                  opacity: calculateThumbnailOpacity(index),
                }}
                onClick={() => (videoRef.current.currentTime = thumbnail.time)}
              />
            ))}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: `${sliderPosition}px`,
                height: "90px",
                width: "5px",
                backgroundColor: "red",
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
      <div
        {...getRootProps()}
        style={{ border: "2px dashed white", padding: 40, textAlign: "center" }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the video here...</p>
        ) : (
          <p>Drag 'n' drop a video here, or click to select a video</p>
        )}
      </div>
    </div>
  );
}

export default VideoUpload;
