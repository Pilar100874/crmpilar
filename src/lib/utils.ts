import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FabricImage, Pattern } from "fabric";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Canvas utility functions
export const applyOffsetWrap = async (img: HTMLImageElement | FabricImage): Promise<string> => {
  // Stub implementation - returns a placeholder data URL
  console.log("applyOffsetWrap called", img);
  const canvas = document.createElement('canvas');
  const element = img instanceof HTMLImageElement ? img : (img as any).getElement();
  canvas.width = element.width;
  canvas.height = element.height;
  const ctx = canvas.getContext('2d');
  if (ctx && element) {
    ctx.drawImage(element, 0, 0);
  }
  return canvas.toDataURL('image/png');
};

export const applyOffsetWrapLeft = async (img: HTMLImageElement | FabricImage): Promise<string> => {
  // Stub implementation - returns a placeholder data URL
  console.log("applyOffsetWrapLeft called", img);
  const canvas = document.createElement('canvas');
  const element = img instanceof HTMLImageElement ? img : (img as any).getElement();
  canvas.width = element.width;
  canvas.height = element.height;
  const ctx = canvas.getContext('2d');
  if (ctx && element) {
    ctx.drawImage(element, 0, 0);
  }
  return canvas.toDataURL('image/png');
};

export const applyOffsetWrapWithCutLine = async (img: HTMLImageElement | FabricImage, position: number): Promise<string> => {
  // Stub implementation - returns a placeholder data URL
  console.log("applyOffsetWrapWithCutLine called", img, position);
  const canvas = document.createElement('canvas');
  const element = img instanceof HTMLImageElement ? img : (img as any).getElement();
  canvas.width = element.width;
  canvas.height = element.height;
  const ctx = canvas.getContext('2d');
  if (ctx && element) {
    ctx.drawImage(element, 0, 0);
  }
  return canvas.toDataURL('image/png');
};

export const applyPattern = async (img: HTMLImageElement | FabricImage, repeatX: number, repeatY: number): Promise<string> => {
  // Stub implementation - returns a placeholder data URL
  console.log("applyPattern called", img, repeatX, repeatY);
  const canvas = document.createElement('canvas');
  const element = img instanceof HTMLImageElement ? img : (img as any).getElement();
  canvas.width = element.width;
  canvas.height = element.height;
  const ctx = canvas.getContext('2d');
  if (ctx && element) {
    ctx.drawImage(element, 0, 0);
  }
  return canvas.toDataURL('image/png');
};
