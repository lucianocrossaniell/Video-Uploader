import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

function VideoUpload() {
  const [videoURL, setVideoURL] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [playTime, setPlayTime] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);

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

  const generateThumbnails = (videoSrc) => {
    const video = document.createElement("video");
    video.src = videoSrc;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;
      const interval = duration / 50;
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

  const handleThumbnailClick = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setPlayTime(time);
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setPlayTime(currentTime);
      const index = thumbnails.findIndex(
        (thumbnail) => thumbnail.time >= currentTime
      );
      setCurrentThumbnailIndex(index >= 0 ? index : currentThumbnailIndex);
    }
  };

  const getThumbnailOpacity = (index) => {
    const distance = Math.abs(index - currentThumbnailIndex);
    if (distance <= 5) {
      return 1 - distance * 0.15; // Decrease opacity as the distance increases
    }
    return 0.1; // Min opacity for thumbnails further away
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
            width="100%"
            controls
            onTimeUpdate={onTimeUpdate}
            style={{ display: "block", margin: "auto", background: "black" }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "90px",
              overflowX: "hidden",
            }}
          >
            {thumbnails.map((thumbnail, index) => (
              <img
                key={index}
                src={thumbnail.src}
                alt={`Thumbnail ${index}`}
                style={{
                  position: "absolute",
                  width: "160px",
                  height: "90px",
                  left: `${index * (160 - 100)}px`,
                  cursor: "pointer",
                  opacity: getThumbnailOpacity(index),
                  border:
                    index === currentThumbnailIndex ? "2px solid red" : "none",
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
          <p>Drag 'n' drop a video here, or click to select a video</p>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default VideoUpload;
