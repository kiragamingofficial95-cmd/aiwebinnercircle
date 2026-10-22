"use client";

import { useEffect, useState } from "react";
import { Video } from "@/data/videos";

interface VideoPlayerProps {
  video: Video;
  onEnded?: () => void;
}

function getYoutubeId(url: string) {
  const m = url.match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getWistiaId(url: string) {
  const m = url.match(/iframe\/([\w]+)/);
  return m ? m[1] : null;
}

function getLoomId(url: string) {
  const m = url.match(/share\/([\w]+)/);
  return m ? m[1] : null;
}

function getDriveId(url: string) {
  const m = url.match(/file\/d\/([\w-]+)/);
  return m ? m[1] : null;
}

export function VideoPlayer({ video, onEnded }: VideoPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t); }, [video.id]);

  const ytId = getYoutubeId(video.url);
  const wistiaId = getWistiaId(video.url);
  const loomId = getLoomId(video.url);
  const driveId = getDriveId(video.url);

  let src = "";
  if (ytId) src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
  else if (wistiaId) src = `https://fast.wistia.net/embed/iframe/${wistiaId}`;
  else if (loomId) src = `https://www.loom.com/embed/${loomId}`;
  else if (driveId) src = `https://drive.google.com/file/d/${driveId}/preview`;

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-500/10">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {src && (
        <iframe
          key={video.id}
          src={src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={video.title}
        />
      )}
    </div>
  );
}
