import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  SRGBColorSpace,
  VideoTexture,
} from 'three';

interface VideoLayerProps {
  src: string;
  playbackRate: number;
  opacity?: number;
  transitionDamping?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function VideoLayer({
  src,
  playbackRate,
  opacity = 0.78,
  transitionDamping = 4,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: VideoLayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const initialOpacity = useRef(opacity);
  const [texture, setTexture] = useState<VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = src;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.playbackRate = playbackRate;

    const nextTexture = new VideoTexture(video);
    nextTexture.colorSpace = SRGBColorSpace;
    videoRef.current = video;
    setTexture(nextTexture);
    void video.play().catch(() => undefined);

    return () => {
      nextTexture.dispose();
      video.pause();
      video.removeAttribute('src');
      video.load();
      videoRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      if (videoRef.current.paused) void videoRef.current.play().catch(() => undefined);
    }
  }, [playbackRate]);

  const fallbackColor = useMemo(() => (texture ? '#ffffff' : '#1f3f54'), [texture]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    materialRef.current.opacity = MathUtils.damp(
      materialRef.current.opacity,
      opacity,
      transitionDamping,
      delta,
    );
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[3.4, 1.9, 32, 16]} />
      <meshBasicMaterial
        ref={materialRef}
        color={fallbackColor}
        map={texture}
        opacity={initialOpacity.current}
        side={DoubleSide}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
