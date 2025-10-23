export const createThumbnail = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set thumbnail dimensions (max 200px)
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const getFileTypeAccept = (fileType: string): string => {
  switch (fileType) {
    case 'image':
      return 'image/jpeg,image/png,image/gif,image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'excel':
      return 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'word':
      return 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return '*/*';
  }
};

export const getFileTypeIcon = (fileType: string | null) => {
  switch (fileType) {
    case 'image':
      return '🖼️';
    case 'pdf':
      return '📄';
    case 'excel':
      return '📊';
    case 'word':
      return '📝';
    default:
      return '📎';
  }
};