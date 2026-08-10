export async function generateThumbnail(file: File, maxSize: number = 64): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) {
    return undefined;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(undefined);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Use low quality JPEG for a tiny base64 string
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };

    img.src = url;
  });
}
