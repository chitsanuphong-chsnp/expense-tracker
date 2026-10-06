# Anime mascot v2

Built-in image_gen generated the transparent puppet kit and three matching poses (reading, thinking, celebration). Original PNGs are preserved here. Optimized PNGs are in apps/app/assets/mascot. Technical alpha trimming, downscaling and PNG compression only.

Web motion uses CSS compositor transforms and opacity; native motion uses React Native Animated with useNativeDriver. Sparse pose changes; no React rendering per frame. Reduced motion and background visibility stop loops. Five moods: wave, idle, reading, thinking, celebrate.

The waving puppet preserves each part's source aspect ratio, with the arm behind the shoulder and proportions matched to the complete poses. Breathing uses translation only; motion distances scale with the displayed size. The old blink head remains archived but is no longer rendered because its geometry differs from the open-eye head. No original image has been overwritten.
