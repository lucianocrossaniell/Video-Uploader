import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

function VideoUpload() {
  const [videoURL, setVideoURL] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [playTime, setPlayTime] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [mainInterval, setMainInterval] = useState(0);
  const [detailedInterval, setDetailedInterval] = useState(0);

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
      .catch((error) => {
        console.error("Error uploading video", error);
      });
  };

  useEffect(() => {
    if (videoURL && videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        calculateIntervals(videoRef.current.duration);
      });
    }
  }, [videoURL]);

  const calculateIntervals = (duration) => {
    setMainInterval(duration / 5);
    setDetailedInterval(duration / 100);
  };

  const generateThumbnails = (videoSrc) => {
    const video = document.createElement("video");
    video.src = videoSrc;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;
      const interval = duration / 100; // More frequent, smaller thumbnails
      let currentTime = 0;

      video.addEventListener("seeked", async () => {
        const canvas = canvasRef.current;
        canvas.width = 60; // Smaller thumbnail width
        canvas.height = 34; // Smaller thumbnail height
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        thumbnails.push({ src: canvas.toDataURL(), time: currentTime });
        setThumbnails([...thumbnails]);

        if (currentTime < duration) {
          currentTime += interval;
          video.currentTime = currentTime;
        }
      });

      // Start generating thumbnails
      video.currentTime = currentTime;
    });
  };

  const handleThumbnailClick = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setPlayTime(time);
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setPlayTime(videoRef.current.currentTime);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "video/*",
  });

  return (
    <div style={{ background: "black", color: "white", padding: "10px" }}>
      {videoURL && (
        <div>
          <video
            ref={videoRef}
            src={videoURL}
            width="50vw"
            controls
            onTimeUpdate={onTimeUpdate}
            style={{ display: "block", margin: "auto", background: "black" }}
          />
          <input
            type="range"
            min="0"
            max={videoRef.current ? videoRef.current.duration : 100}
            value={playTime}
            onChange={(e) =>
              (videoRef.current.currentTime = e.target.valueAsNumber)
            }
            style={{
              width: "100%",
              appearance: "none",
              height: "2px",
              background: "white",
            }}
          />
          <div
            style={{
              display: "flex",
              overflowX: "auto", // Allow horizontal scrolling
              whiteSpace: "nowrap", // Prevent thumbnails from wrapping onto the next line
              justifyContent: "center",
              flexWrap: "nowrap", // Ensure no wrapping occurs
              gap: "2px",
            }}
          >
            {thumbnails.map((thumbnail, index) => (
              <img
                key={index}
                src={thumbnail.src}
                alt={`Thumbnail ${index}`}
                style={{
                  width: "60px",
                  cursor: "pointer",
                  border:
                    playTime >= thumbnail.time &&
                    playTime < thumbnail.time + detailedInterval
                      ? "2px solid red"
                      : "none",
                }}
                onClick={() => handleThumbnailClick(thumbnail.time)}
              />
            ))}
          </div>
        </div>
      )}
      <div
        {...getRootProps()}
        style={{ border: "2px dashed white", padding: 40, textAlign: "center" }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the video here...</p>
        ) : (
          <p> Drag 'n' drop a video here, or click to select a video</p>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default VideoUpload;
