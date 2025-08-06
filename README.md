## Video Uploader

Video Upload & Trimmer is a React-based tool for uploading, previewing, and trimming videos directly in the browser. It features an interactive timeline with thumbnails, draggable trim handles, and real-time slider updates — making video editing intuitive and user-friendly.

### Features
- Drag-and-drop or select video files for upload

- Auto-generated video thumbnails across the timeline

- Interactive slider and draggable trim handles

- Loop playback between trim start and end

- Real-time time display synced with slider

- Timeline clicking to jump to specific points

-  Spacebar toggles play/pause

-  Uploads video to a backend via Axios

## How It Works
1. Upload
User can drag and drop or click to upload a video.

The video file is uploaded to the server using axios.

2. Thumbnail Generation
After metadata loads, thumbnails are generated at intervals (20 total).

A hidden <canvas> element draws frames from the video and stores them as images.

3. Timeline & Slider
A timeline is rendered with all generated thumbnails.

A white slider bar moves with the video time.

A floating timestamp shows the current time above the slider.

4. Trimming
Two draggable handles define the trim start and end.

Video loops only within this defined range.

5. User Interaction
Users can:

Click the timeline to jump to a specific time.

Drag the slider or handles on desktop and mobile.

Use the spacebar to play/pause the video.

### Tech Stack
React – UI framework

React Dropzone – File upload UX

Font Awesome – Upload icon

Axios – File upload to backend

HTML5 Video + Canvas – Thumbnail generation and control


#### Designed for desktop and mobile interaction.

Future enhancements can include export/download of trimmed segments.

<img width="1106" alt="Screenshot 2024-05-03 at 5 28 32 PM" src="https://github.com/lcniell123/VideoUploader/assets/14323809/91865775-8b43-45f2-b61a-695d232ff655">


